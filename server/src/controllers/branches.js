// server/src/controllers/branches.js
// DB-backed branches controller
const { query } = require('../config/db');
const R = require('../utils/response');

exports.getAll = async (req, res) => {
  try {
    const result = await query(
      `SELECT b.*, COUNT(DISTINCT s.id) AS staff_count
       FROM branches b
       LEFT JOIN staff s ON s.branch_id = b.id AND s.is_active = TRUE
       WHERE b.is_active = TRUE
       GROUP BY b.id
       ORDER BY b.name ASC`
    );
    return R.ok(res, result.rows);
  } catch (err) { return R.error(res, 'Failed to fetch branches'); }
};

exports.getOne = async (req, res) => {
  try {
    const result = await query('SELECT * FROM branches WHERE id=$1', [req.params.id]);
    if (!result.rows.length) return R.notFound(res, 'Branch');
    return R.ok(res, result.rows[0]);
  } catch (err) { return R.error(res, 'Failed to fetch branch'); }
};

exports.create = async (req, res) => {
  try {
    const { name, address, city, phone, email } = req.body;
    if (!name) return R.badRequest(res, 'Branch name required');
    const result = await query(
      'INSERT INTO branches (name, address, city, phone, email) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [name, address||null, city||null, phone||null, email||null]
    );
    return R.created(res, result.rows[0]);
  } catch (err) { return R.error(res, 'Failed to create branch'); }
};

exports.update = async (req, res) => {
  try {
    const { name, address, city, phone, email, is_active } = req.body;
    const result = await query(
      `UPDATE branches SET
         name=COALESCE($1,name), address=COALESCE($2,address), city=COALESCE($3,city),
         phone=COALESCE($4,phone), email=COALESCE($5,email),
         is_active=COALESCE($6,is_active), updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [name,address,city,phone,email,is_active,req.params.id]
    );
    if (!result.rows.length) return R.notFound(res, 'Branch');
    return R.ok(res, result.rows[0]);
  } catch (err) { return R.error(res, 'Failed to update branch'); }
};
