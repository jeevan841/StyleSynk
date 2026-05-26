// server/src/services/commission.js
// Auto-calculate and persist commissions when a bill is closed

const { query } = require('../config/db');

/**
 * calculateCommissions — triggered when bill status changes to 'paid'
 * Reads all invoice_items for the bill, finds each item's staff + commission %,
 * inserts a commission record per service item.
 *
 * @param {string} billId
 * @param {object} client - optional pg client for transaction
 * @returns {Array} created commission records
 */
async function calculateCommissions(billId, client = null) {
  const db = client || { query: (sql, p) => query(sql, p) };

  // Fetch all service-type line items for this bill
  const itemsResult = await db.query(
    `SELECT ii.id AS invoice_item_id,
            ii.staff_id,
            ii.item_name,
            ii.line_total,
            COALESCE(s.commission_pct, st.commission_pct, 30) AS commission_pct
     FROM invoice_items ii
     LEFT JOIN services s  ON s.id  = ii.service_id
     LEFT JOIN staff    st ON st.id = ii.staff_id
     WHERE ii.bill_id = $1 AND ii.item_type = 'service' AND ii.staff_id IS NOT NULL`,
    [billId]
  );

  const period = new Date().toISOString().slice(0, 7); // YYYY-MM
  const created = [];

  for (const item of itemsResult.rows) {
    const commission_amt = Math.round(item.line_total * (item.commission_pct / 100) * 100) / 100;

    const result = await db.query(
      `INSERT INTO commissions
         (staff_id, bill_id, invoice_item_id, service_name, service_amount, commission_pct, commission_amt, period_month)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        item.staff_id,
        billId,
        item.invoice_item_id,
        item.item_name,
        item.line_total,
        item.commission_pct,
        commission_amt,
        period,
      ]
    );
    created.push(result.rows[0]);
  }

  return created;
}

module.exports = { calculateCommissions };
