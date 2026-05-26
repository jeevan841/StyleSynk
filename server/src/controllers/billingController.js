// server/src/controllers/billingController.js
// POS Billing: create draft → add items → close bill (triggers commission, inventory, loyalty)

const { query, getClient } = require('../config/db');
const { calculateInvoice, generateBillNumber } = require('../services/invoice');
const { calculateCommissions } = require('../services/commission');
const { deductInventoryForBill } = require('../services/inventory');
const { awardLoyaltyPoints } = require('../services/loyalty');
const { emitBillClosed, emitNotification } = require('../socket');
const R = require('../utils/response');

// ── GET /api/billing ───────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { branch_id, status, customer_id, limit = 50, offset = 0 } = req.query;
    let sql = `
      SELECT b.*, c.name AS customer_name,
             COUNT(ii.id) AS item_count
      FROM bills b
      LEFT JOIN customers c ON c.id = b.customer_id
      LEFT JOIN invoice_items ii ON ii.bill_id = b.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    const scopedBranch = req.user?.role !== 'owner' ? req.user?.branch_id : (branch_id || null);
    if (scopedBranch)  { sql += ` AND b.branch_id = $${idx++}`;   params.push(scopedBranch); }
    if (status)        { sql += ` AND b.status = $${idx++}`;       params.push(status); }
    if (customer_id)   { sql += ` AND b.customer_id = $${idx++}`;  params.push(customer_id); }

    sql += ` GROUP BY b.id, c.name ORDER BY b.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);
    return R.ok(res, result.rows);
  } catch (err) {
    return R.error(res, 'Failed to fetch bills');
  }
};

// ── GET /api/billing/:id ───────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const [billResult, itemsResult] = await Promise.all([
      query(`SELECT b.*, c.name AS customer_name, c.phone AS customer_phone,
                    br.name AS branch_name
             FROM bills b
             LEFT JOIN customers c  ON c.id  = b.customer_id
             LEFT JOIN branches  br ON br.id = b.branch_id
             WHERE b.id = $1`, [req.params.id]),
      query(`SELECT ii.*, s.name AS service_name, st.name AS staff_name
             FROM invoice_items ii
             LEFT JOIN services s ON s.id = ii.service_id
             LEFT JOIN staff st   ON st.id = ii.staff_id
             WHERE ii.bill_id = $1`, [req.params.id]),
    ]);

    if (!billResult.rows.length) return R.notFound(res, 'Bill');

    return R.ok(res, { ...billResult.rows[0], items: itemsResult.rows });
  } catch (err) {
    return R.error(res, 'Failed to fetch bill');
  }
};

// ── POST /api/billing/draft ────────────────────────────────
// Create an empty draft bill
exports.createDraft = async (req, res) => {
  try {
    const { branch_id, customer_id, appointment_id, payment_method = 'cash' } = req.body;
    if (!branch_id) return R.badRequest(res, 'branch_id is required');

    // Generate sequential bill number
    const countResult = await query(
      `SELECT COUNT(*) FROM bills WHERE DATE(created_at) = CURRENT_DATE AND branch_id = $1`,
      [branch_id]
    );
    const seq = parseInt(countResult.rows[0].count) + 1;

    // Short branch code from name
    const branchResult = await query('SELECT name FROM branches WHERE id=$1', [branch_id]);
    const branchCode = branchResult.rows[0]?.name?.split(' ').map(w => w[0]).join('') || 'SS';
    const bill_number = generateBillNumber(branchCode, seq);

    const result = await query(
      `INSERT INTO bills (bill_number, branch_id, customer_id, appointment_id, payment_method, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [bill_number, branch_id, customer_id || null, appointment_id || null, payment_method, req.user?.id || null]
    );

    return R.created(res, result.rows[0], 'Draft bill created');
  } catch (err) {
    console.error('createDraft:', err);
    return R.error(res, 'Failed to create draft bill', 500, err.message);
  }
};

// ── POST /api/billing/:id/items ────────────────────────────
// Add line items to a draft bill
exports.addItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { service_id, staff_id, item_name, item_type = 'service', quantity = 1, unit_price, discount_pct = 0 } = req.body;

    if (!item_name || !unit_price) return R.badRequest(res, 'item_name and unit_price required');

    // Check bill exists and is in draft
    const billCheck = await query('SELECT status FROM bills WHERE id=$1', [id]);
    if (!billCheck.rows.length) return R.notFound(res, 'Bill');
    if (billCheck.rows[0].status !== 'draft') return R.badRequest(res, 'Can only add items to draft bills');

    const base = parseFloat(unit_price) * parseInt(quantity);
    const disc = base * (parseFloat(discount_pct) / 100);
    const line_total = Math.round((base - disc) * 100) / 100;

    const result = await query(
      `INSERT INTO invoice_items (bill_id, service_id, staff_id, item_name, item_type, quantity, unit_price, discount_pct, line_total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [id, service_id || null, staff_id || null, item_name, item_type, quantity, unit_price, discount_pct, line_total]
    );

    return R.created(res, result.rows[0], 'Item added');
  } catch (err) {
    return R.error(res, 'Failed to add item');
  }
};

// ── POST /api/billing/:id/close ────────────────────────────
// THE MASTER CASCADE: closes bill → commissions → inventory → loyalty → notification
exports.closeBill = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { discount_pct = 0, payment_method, membership_id, loyalty_redeemed = 0 } = req.body;
    const db = { query: (sql, p) => client.query(sql, p) };

    // Fetch bill
    const billResult = await client.query('SELECT * FROM bills WHERE id=$1 FOR UPDATE', [id]);
    if (!billResult.rows.length) { await client.query('ROLLBACK'); return R.notFound(res, 'Bill'); }
    const bill = billResult.rows[0];
    if (bill.status !== 'draft') { await client.query('ROLLBACK'); return R.badRequest(res, 'Bill is already closed'); }

    // Fetch items
    const itemsResult = await client.query(
      'SELECT * FROM invoice_items WHERE bill_id=$1',
      [id]
    );
    const items = itemsResult.rows;
    if (!items.length) { await client.query('ROLLBACK'); return R.badRequest(res, 'Cannot close a bill with no items'); }

    // Validate loyalty redemption
    if (loyalty_redeemed > 0 && bill.customer_id) {
      const custResult = await client.query('SELECT loyalty_points FROM customers WHERE id=$1', [bill.customer_id]);
      const available = custResult.rows[0]?.loyalty_points || 0;
      if (loyalty_redeemed > available) {
        await client.query('ROLLBACK');
        return R.badRequest(res, `Cannot redeem ${loyalty_redeemed} points; customer only has ${available}`);
      }
    }

    // Calculate totals
    const totals = calculateInvoice(items, discount_pct, 18, loyalty_redeemed);

    // Update bill to paid
    const updatedBill = await client.query(
      `UPDATE bills SET
         status = 'paid',
         subtotal = $1, discount_amount = $2, discount_pct = $3,
         gst_rate = $4, gst_amount = $5, total_amount = $6,
         payment_method = COALESCE($7, payment_method),
         membership_id  = COALESCE($8, membership_id),
         loyalty_redeemed = $9,
         paid_at = NOW(), updated_at = NOW()
       WHERE id = $10 RETURNING *`,
      [
        totals.subtotal, totals.discount_amount, totals.discount_pct,
        totals.gst_rate, totals.gst_amount, totals.total,
        payment_method || null, membership_id || null,
        loyalty_redeemed,
        id,
      ]
    );

    // ── CASCADE 1: Commissions ─────────────────────────────
    const commissions = await calculateCommissions(id, db);

    // ── CASCADE 2: Inventory deduction ────────────────────
    const inventoryDeductions = await deductInventoryForBill(id, bill.branch_id, db);

    // ── CASCADE 3: Loyalty points ─────────────────────────
    const loyalty = await awardLoyaltyPoints(
      bill.customer_id, id, totals.total, loyalty_redeemed, db
    );

    // ── CASCADE 4: Update appointment status → completed ──
    if (bill.appointment_id) {
      await client.query(
        `UPDATE appointments SET status='completed', bill_id=$1, updated_at=NOW() WHERE id=$2`,
        [id, bill.appointment_id]
      );
    }

    // ── CASCADE 5: Notification ───────────────────────────
    await client.query(
      `INSERT INTO notifications (branch_id, type, title, message, channel, reference_id, reference_type)
       VALUES ($1, 'bill', $2, $3, 'in_app', $4, 'bill')`,
      [
        bill.branch_id,
        `Bill Closed — ₹${totals.total.toFixed(2)}`,
        `Bill ${bill.bill_number} paid. Total: ₹${totals.total.toFixed(2)}. Points earned: ${loyalty?.earned || 0}.`,
        id,
      ]
    );

    await client.query('COMMIT');

    const finalBill = { ...updatedBill.rows[0], items, totals, commissions, inventoryDeductions, loyalty };

    // Real-time event
    emitBillClosed(bill.branch_id, finalBill);

    return R.ok(res, finalBill, 'Bill closed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('closeBill error:', err);
    return R.error(res, 'Failed to close bill', 500, err.message);
  } finally {
    client.release();
  }
};
