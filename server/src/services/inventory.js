// server/src/services/inventory.js
// Auto-deduct inventory when a bill is closed + emit low-stock alerts

const { query } = require('../config/db');
const { emitLowStock } = require('../socket');

/**
 * deductInventoryForBill — called on bill close
 * Finds product-type invoice items and reduces inventory for the branch.
 * Emits a low-stock Socket.IO alert if quantity falls below threshold.
 *
 * @param {string} billId
 * @param {string} branchId
 * @param {object|null} client - pg client for transaction
 * @returns {Array} deduction records
 */
async function deductInventoryForBill(billId, branchId, client = null) {
  const db = client || { query: (sql, p) => query(sql, p) };

  // Get product items on this bill
  const itemsResult = await db.query(
    `SELECT item_name, quantity FROM invoice_items
     WHERE bill_id = $1 AND item_type = 'product'`,
    [billId]
  );

  const deductions = [];

  for (const item of itemsResult.rows) {
    // Find matching inventory by product name in the same branch
    const invResult = await db.query(
      `SELECT id, quantity, low_stock_threshold, product_name
       FROM inventory
       WHERE branch_id = $1 AND LOWER(product_name) = LOWER($2)
       LIMIT 1`,
      [branchId, item.item_name]
    );

    if (!invResult.rows.length) continue;

    const inv = invResult.rows[0];
    const newQty = Math.max(0, inv.quantity - item.quantity);

    await db.query(
      `UPDATE inventory SET quantity = $1, updated_at = NOW() WHERE id = $2`,
      [newQty, inv.id]
    );

    deductions.push({ product: inv.product_name, deducted: item.quantity, remaining: newQty });

    // Emit low-stock alert if threshold crossed
    if (newQty <= inv.low_stock_threshold) {
      emitLowStock(branchId, {
        product_name:     inv.product_name,
        inventory_id:     inv.id,
        quantity:         newQty,
        threshold:        inv.low_stock_threshold,
        branch_id:        branchId,
      });

      // Persist notification
      await db.query(
        `INSERT INTO notifications (branch_id, type, title, message, channel)
         VALUES ($1, 'low_stock', $2, $3, 'in_app')`,
        [
          branchId,
          'Low Stock Alert',
          `${inv.product_name} is running low (${newQty} units remaining).`,
        ]
      );
    }
  }

  return deductions;
}

module.exports = { deductInventoryForBill };
