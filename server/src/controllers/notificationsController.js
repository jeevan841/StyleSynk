// server/src/controllers/notificationsController.js
const { query } = require('../config/db');
const R = require('../utils/response');

exports.getAll = async (req, res) => {
  try {
    const { branch_id, unread } = req.query;
    const scopedBranch = req.user?.role !== 'owner' ? req.user?.branch_id : (branch_id || null);
    let sql = 'SELECT * FROM notifications WHERE 1=1';
    const params = [];
    let idx = 1;
    if (scopedBranch) { sql += ` AND branch_id = $${idx++}`; params.push(scopedBranch); }
    if (unread === 'true') { sql += ' AND is_read = FALSE'; }
    sql += ' ORDER BY created_at DESC LIMIT 50';
    const result = await query(sql, params);
    return R.ok(res, result.rows);
  } catch (err) { return R.error(res, 'Failed to fetch notifications'); }
};

exports.markRead = async (req, res) => {
  try {
    await query('UPDATE notifications SET is_read=TRUE WHERE id=$1', [req.params.id]);
    return R.ok(res, { id: req.params.id });
  } catch (err) { return R.error(res, 'Failed to mark as read'); }
};

exports.markAllRead = async (req, res) => {
  try {
    const scopedBranch = req.user?.role !== 'owner' ? req.user?.branch_id : req.body?.branch_id;
    await query(
      'UPDATE notifications SET is_read=TRUE WHERE branch_id=$1 AND is_read=FALSE',
      [scopedBranch]
    );
    return R.ok(res, null, 'All notifications marked as read');
  } catch (err) { return R.error(res, 'Failed to mark notifications'); }
};
