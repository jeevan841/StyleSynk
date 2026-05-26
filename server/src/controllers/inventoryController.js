// server/src/controllers/inventoryController.js
const { query } = require('../config/db');
const { emitLowStock } = require('../socket');
const R = require('../utils/response');

exports.getAll = async (req, res) => {
  try {
    const { branch_id, low_stock } = req.query;
    const scopedBranch = req.user?.role !== 'owner' ? req.user?.branch_id : (branch_id || null);
    let sql = `SELECT i.*, b.name AS branch_name FROM inventory i LEFT JOIN branches b ON b.id = i.branch_id WHERE 1=1`;
    const params = [];
    let idx = 1;
    if (scopedBranch) { sql += ` AND i.branch_id = $${idx++}`; params.push(scopedBranch); }
    if (low_stock === 'true') { sql += ` AND i.quantity <= i.low_stock_threshold`; }
    sql += ' ORDER BY i.product_name ASC';
    const result = await query(sql, params);
    return R.ok(res, result.rows);
  } catch (err) { return R.error(res, 'Failed to fetch inventory'); }
};

exports.getOne = async (req, res) => {
  try {
    const result = await query('SELECT * FROM inventory WHERE id=$1', [req.params.id]);
    if (!result.rows.length) return R.notFound(res, 'Inventory item');
    return R.ok(res, result.rows[0]);
  } catch (err) { return R.error(res, 'Failed to fetch item'); }
};

exports.create = async (req, res) => {
  try {
    const { branch_id, product_name, sku, category, quantity, unit, low_stock_threshold, unit_cost, unit_price, supplier } = req.body;
    if (!branch_id || !product_name) return R.badRequest(res, 'branch_id and product_name required');
    const result = await query(
      `INSERT INTO inventory (branch_id, product_name, sku, category, quantity, unit, low_stock_threshold, unit_cost, unit_price, supplier)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [branch_id, product_name, sku||null, category||null, quantity||0, unit||'units', low_stock_threshold||5, unit_cost||0, unit_price||0, supplier||null]
    );
    return R.created(res, result.rows[0]);
  } catch (err) { return R.error(res, 'Failed to create item'); }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, low_stock_threshold, unit_price, unit_cost, supplier } = req.body;
    const result = await query(
      `UPDATE inventory SET
         quantity = COALESCE($1, quantity),
         low_stock_threshold = COALESCE($2, low_stock_threshold),
         unit_price = COALESCE($3, unit_price),
         unit_cost = COALESCE($4, unit_cost),
         supplier = COALESCE($5, supplier),
         last_restocked = CASE WHEN $1 IS NOT NULL THEN NOW() ELSE last_restocked END,
         updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [quantity ?? null, low_stock_threshold ?? null, unit_price ?? null, unit_cost ?? null, supplier ?? null, id]
    );
    if (!result.rows.length) return R.notFound(res, 'Inventory item');

    const item = result.rows[0];
    if (item.quantity <= item.low_stock_threshold) {
      emitLowStock(item.branch_id, item);
    }
    return R.ok(res, item);
  } catch (err) { return R.error(res, 'Failed to update item'); }
};

exports.remove = async (req, res) => {
  try {
    const result = await query('DELETE FROM inventory WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return R.notFound(res, 'Inventory item');
    return R.ok(res, { id: req.params.id });
  } catch (err) { return R.error(res, 'Failed to delete item'); }
};
