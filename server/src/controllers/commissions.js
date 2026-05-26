// server/src/controllers/commissions.js
// Commission queries — earnings reports + manual recalculate

const { query }                = require('../config/db');
const { calculateCommissions } = require('../services/commission');
const R = require('../utils/response');

// ── GET /api/commissions ──────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { staff_id, branch_id, month, status, limit = 100, offset = 0 } = req.query;

    let sql = `
      SELECT c.*,
             st.name  AS staff_name,
             st.commission_pct AS staff_default_rate,
             b.name   AS branch_name,
             bi.bill_number
      FROM commissions c
      LEFT JOIN staff    st ON st.id = c.staff_id
      LEFT JOIN branches b  ON b.id  = st.branch_id
      LEFT JOIN bills    bi ON bi.id = c.bill_id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    // Stylist can only see their own commissions
    const scopedStaff = req.user?.role === 'stylist'
      ? req.user?.staff_id
      : (staff_id || null);

    const scopedBranch = req.user?.role === 'branch_manager'
      ? req.user?.branch_id
      : (branch_id || null);

    if (scopedStaff)  { sql += ` AND c.staff_id = $${idx++}`;    params.push(scopedStaff); }
    if (scopedBranch) { sql += ` AND st.branch_id = $${idx++}`;  params.push(scopedBranch); }
    if (month)        { sql += ` AND c.period_month = $${idx++}`; params.push(month); }
    if (status)       { sql += ` AND c.status = $${idx++}`;       params.push(status); }

    sql += ` ORDER BY c.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);

    // Aggregates
    const totalRes = await query(
      `SELECT COALESCE(SUM(commission_amt), 0) AS total,
              COUNT(*) AS count
       FROM commissions c
       LEFT JOIN staff st ON st.id = c.staff_id
       WHERE 1=1
       ${scopedStaff  ? `AND c.staff_id  = '${scopedStaff}'`  : ''}
       ${scopedBranch ? `AND st.branch_id = '${scopedBranch}'` : ''}
       ${month        ? `AND c.period_month = '${month}'`       : ''}`
    );

    return R.ok(res, {
      commissions: result.rows,
      summary: totalRes.rows[0],
    });
  } catch (err) {
    console.error('commissions.getAll:', err);
    return R.error(res, 'Failed to fetch commissions');
  }
};

// ── POST /api/commissions/calculate ──────────────────────
// Manual recalculate commissions for a bill (idempotent if already exist)
exports.calculate = async (req, res) => {
  try {
    const { bill_id } = req.body;
    if (!bill_id) return R.badRequest(res, 'bill_id required');

    // Delete existing commissions for this bill before recalculating
    await query('DELETE FROM commissions WHERE bill_id=$1', [bill_id]);

    const commissions = await calculateCommissions(bill_id);
    return R.ok(res, commissions, `${commissions.length} commission(s) calculated`);
  } catch (err) {
    return R.error(res, 'Failed to calculate commissions', 500, err.message);
  }
};
