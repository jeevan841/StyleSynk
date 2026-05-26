// server/src/controllers/services.js
// DB-backed services controller
const { query } = require('../config/db');
const R = require('../utils/response');

exports.getAll = async (req, res) => {
  try {
    const { category } = req.query;
    let sql = 'SELECT * FROM services WHERE is_active=TRUE';
    const params = [];
    if (category) { sql += ' AND category=$1'; params.push(category); }
    sql += ' ORDER BY category, name ASC';
    const result = await query(sql, params);
    return R.ok(res, result.rows);
  } catch (err) { return R.error(res, 'Failed to fetch services'); }
};

exports.getOne = async (req, res) => {
  try {
    const result = await query('SELECT * FROM services WHERE id=$1', [req.params.id]);
    if (!result.rows.length) return R.notFound(res, 'Service');
    return R.ok(res, result.rows[0]);
  } catch (err) { return R.error(res, 'Failed to fetch service'); }
};

exports.create = async (req, res) => {
  try {
    const { name, category, description, price, duration_min, commission_pct } = req.body;
    if (!name || !price) return R.badRequest(res, 'name and price required');
    const result = await query(
      `INSERT INTO services (name, category, description, price, duration_min, commission_pct)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, category||'hair', description||null, price, duration_min||30, commission_pct||30]
    );
    return R.created(res, result.rows[0]);
  } catch (err) { return R.error(res, 'Failed to create service'); }
};

exports.update = async (req, res) => {
  try {
    const { name, category, description, price, duration_min, commission_pct, is_active } = req.body;
    const result = await query(
      `UPDATE services SET
         name=COALESCE($1,name), category=COALESCE($2,category),
         description=COALESCE($3,description), price=COALESCE($4,price),
         duration_min=COALESCE($5,duration_min), commission_pct=COALESCE($6,commission_pct),
         is_active=COALESCE($7,is_active), updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [name,category,description,price,duration_min,commission_pct,is_active,req.params.id]
    );
    if (!result.rows.length) return R.notFound(res, 'Service');
    return R.ok(res, result.rows[0]);
  } catch (err) { return R.error(res, 'Failed to update service'); }
};
