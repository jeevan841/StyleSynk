// server/src/controllers/customers.js
// DB-backed customers controller (replaces old clients.js)
const { query } = require('../config/db');
const R = require('../utils/response');

exports.getAll = async (req, res) => {
  try {
    const { branch_id, search, limit = 50, offset = 0 } = req.query;
    const scopedBranch = req.user?.role !== 'owner' ? req.user?.branch_id : (branch_id || null);
    let sql = 'SELECT * FROM customers WHERE is_active=TRUE';
    const params = [];
    let idx = 1;
    if (scopedBranch) { sql += ` AND branch_id=$${idx++}`; params.push(scopedBranch); }
    if (search) {
      sql += ` AND (name ILIKE $${idx} OR phone ILIKE $${idx} OR email ILIKE $${idx})`;
      params.push(`%${search}%`); idx++;
    }
    sql += ` ORDER BY name ASC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(parseInt(limit), parseInt(offset));
    const result = await query(sql, params);
    return R.ok(res, result.rows);
  } catch (err) { return R.error(res, 'Failed to fetch customers'); }
};

exports.getOne = async (req, res) => {
  try {
    const [custResult, apptResult, loyaltyResult] = await Promise.all([
      query('SELECT c.*, b.name AS branch_name FROM customers c LEFT JOIN branches b ON b.id=c.branch_id WHERE c.id=$1', [req.params.id]),
      query(`SELECT a.*, s.name AS service_name, st.name AS staff_name
             FROM appointments a
             LEFT JOIN services s ON s.id=a.service_id
             LEFT JOIN staff st ON st.id=a.staff_id
             WHERE a.customer_id=$1 ORDER BY a.start_time DESC LIMIT 10`, [req.params.id]),
      query('SELECT * FROM loyalty_points WHERE customer_id=$1 ORDER BY created_at DESC LIMIT 10', [req.params.id]),
    ]);
    if (!custResult.rows.length) return R.notFound(res, 'Customer');
    return R.ok(res, { ...custResult.rows[0], recent_appointments: apptResult.rows, loyalty_history: loyaltyResult.rows });
  } catch (err) { return R.error(res, 'Failed to fetch customer'); }
};

exports.create = async (req, res) => {
  try {
    const { name, email, phone, gender, date_of_birth, branch_id, notes } = req.body;
    if (!name) return R.badRequest(res, 'Customer name required');
    const result = await query(
      `INSERT INTO customers (name, email, phone, gender, date_of_birth, branch_id, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name, email||null, phone||null, gender||null, date_of_birth||null, branch_id||null, notes||null]
    );
    return R.created(res, result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return R.conflict(res, 'Email already registered');
    return R.error(res, 'Failed to create customer', 500, err.message);
  }
};

exports.update = async (req, res) => {
  try {
    const { name, email, phone, gender, notes, is_active } = req.body;
    const result = await query(
      `UPDATE customers SET
         name=COALESCE($1,name), email=COALESCE($2,email), phone=COALESCE($3,phone),
         gender=COALESCE($4,gender), notes=COALESCE($5,notes),
         is_active=COALESCE($6,is_active), updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [name,email,phone,gender,notes,is_active,req.params.id]
    );
    if (!result.rows.length) return R.notFound(res, 'Customer');
    return R.ok(res, result.rows[0]);
  } catch (err) { return R.error(res, 'Failed to update customer'); }
};
