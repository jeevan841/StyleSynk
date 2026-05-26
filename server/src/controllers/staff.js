// server/src/controllers/staff.js
// DB-backed staff controller
const { query } = require('../config/db');
const R = require('../utils/response');

exports.getAll = async (req, res) => {
  try {
    const { branch_id } = req.query;
    const scopedBranch = req.user?.role !== 'owner' ? req.user?.branch_id : (branch_id || null);
    let sql = `
      SELECT s.*, b.name AS branch_name,
             COALESCE(AVG(cf.rating), s.rating) AS avg_rating,
             COUNT(DISTINCT a.id) AS total_appointments
      FROM staff s
      LEFT JOIN branches b ON b.id = s.branch_id
      LEFT JOIN customer_feedback cf ON cf.staff_id = s.id
      LEFT JOIN appointments a ON a.staff_id = s.id AND a.status='completed'
      WHERE s.is_active=TRUE
    `;
    const params = [];
    if (scopedBranch) { sql += ' AND s.branch_id = $1'; params.push(scopedBranch); }
    sql += ' GROUP BY s.id, b.name ORDER BY s.name ASC';
    const result = await query(sql, params);
    return R.ok(res, result.rows);
  } catch (err) { return R.error(res, 'Failed to fetch staff'); }
};

exports.getOne = async (req, res) => {
  try {
    const result = await query(
      `SELECT s.*, b.name AS branch_name FROM staff s
       LEFT JOIN branches b ON b.id = s.branch_id WHERE s.id=$1`,
      [req.params.id]
    );
    if (!result.rows.length) return R.notFound(res, 'Staff');
    return R.ok(res, result.rows[0]);
  } catch (err) { return R.error(res, 'Failed to fetch staff member'); }
};

exports.create = async (req, res) => {
  try {
    const { branch_id, name, email, phone, specialization, experience_yrs, commission_pct } = req.body;
    if (!branch_id || !name) return R.badRequest(res, 'branch_id and name required');
    const result = await query(
      `INSERT INTO staff (branch_id, name, email, phone, specialization, experience_yrs, commission_pct)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [branch_id, name, email||null, phone||null, specialization||[], experience_yrs||0, commission_pct||30]
    );
    return R.created(res, result.rows[0]);
  } catch (err) { return R.error(res, 'Failed to create staff', 500, err.message); }
};

exports.update = async (req, res) => {
  try {
    const { name, email, phone, specialization, experience_yrs, commission_pct, is_active } = req.body;
    const result = await query(
      `UPDATE staff SET
         name=COALESCE($1,name), email=COALESCE($2,email), phone=COALESCE($3,phone),
         specialization=COALESCE($4,specialization), experience_yrs=COALESCE($5,experience_yrs),
         commission_pct=COALESCE($6,commission_pct), is_active=COALESCE($7,is_active), updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [name,email,phone,specialization,experience_yrs,commission_pct,is_active,req.params.id]
    );
    if (!result.rows.length) return R.notFound(res, 'Staff');
    return R.ok(res, result.rows[0]);
  } catch (err) { return R.error(res, 'Failed to update staff'); }
};

// GET /api/staff/:id/commissions
exports.getCommissions = async (req, res) => {
  try {
    const { month } = req.query;
    let sql = 'SELECT c.*, b.bill_number FROM commissions c LEFT JOIN bills b ON b.id=c.bill_id WHERE c.staff_id=$1';
    const params = [req.params.id];
    if (month) { sql += ' AND c.period_month=$2'; params.push(month); }
    sql += ' ORDER BY c.created_at DESC';
    const result = await query(sql, params);
    return R.ok(res, result.rows);
  } catch (err) { return R.error(res, 'Failed to fetch commissions'); }
};
