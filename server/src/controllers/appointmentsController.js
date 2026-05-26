// server/src/controllers/appointmentsController.js
// Full appointment CRUD with collision detection + Socket.IO + DB

const { query, getClient } = require('../config/db');
const { checkCollision }   = require('../services/collision');
const { emitAppointmentCreated, emitAppointmentUpdated } = require('../socket');
const R = require('../utils/response');

// ── GET /api/appointments ─────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { branch_id, date, status, staff_id, limit = 100, offset = 0 } = req.query;

    let sql = `
      SELECT a.*,
             c.name  AS customer_name, c.phone AS customer_phone,
             s.name  AS service_name,  s.duration_min,
             st.name AS staff_name,
             b.name  AS branch_name
      FROM appointments a
      LEFT JOIN customers c ON c.id = a.customer_id
      LEFT JOIN services  s ON s.id = a.service_id
      LEFT JOIN staff    st ON st.id = a.staff_id
      LEFT JOIN branches  b ON b.id = a.branch_id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    // Branch scoping: non-owner roles can only see their own branch
    const scopedBranch = req.user?.role !== 'owner' ? req.user?.branch_id : (branch_id || null);
    if (scopedBranch) { sql += ` AND a.branch_id = $${idx++}`; params.push(scopedBranch); }
    if (date)         { sql += ` AND DATE(a.start_time AT TIME ZONE 'Asia/Kolkata') = $${idx++}`; params.push(date); }
    if (status)       { sql += ` AND a.status = $${idx++}`; params.push(status); }
    if (staff_id)     { sql += ` AND a.staff_id = $${idx++}`; params.push(staff_id); }

    sql += ` ORDER BY a.start_time ASC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);
    return R.ok(res, result.rows);
  } catch (err) {
    console.error('getAll appointments:', err);
    return R.error(res, 'Failed to fetch appointments');
  }
};

// ── GET /api/appointments/:id ──────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const result = await query(
      `SELECT a.*,
              c.name AS customer_name, c.phone AS customer_phone,
              s.name AS service_name,  s.duration_min, s.price AS service_price,
              st.name AS staff_name,
              b.name  AS branch_name
       FROM appointments a
       LEFT JOIN customers c ON c.id = a.customer_id
       LEFT JOIN services  s ON s.id = a.service_id
       LEFT JOIN staff    st ON st.id = a.staff_id
       LEFT JOIN branches  b ON b.id = a.branch_id
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return R.notFound(res, 'Appointment');
    return R.ok(res, result.rows[0]);
  } catch (err) {
    return R.error(res, 'Failed to fetch appointment');
  }
};

// ── POST /api/appointments ────────────────────────────────
exports.create = async (req, res) => {
  try {
    const {
      branch_id, customer_id, staff_id, service_id,
      start_time, end_time, notes, channel = 'walk_in',
      customer_name, customer_phone, // for walk-in without account
    } = req.body;

    if (!branch_id || !staff_id || !service_id || !start_time || !end_time) {
      return R.badRequest(res, 'branch_id, staff_id, service_id, start_time, end_time are required');
    }

    // Validate time range
    if (new Date(end_time) <= new Date(start_time)) {
      return R.badRequest(res, 'end_time must be after start_time');
    }

    // Collision check
    const { hasConflict, conflicts } = await checkCollision(staff_id, start_time, end_time);
    if (hasConflict) {
      return R.conflict(res, `Stylist is already booked during this time slot. Conflicts: ${conflicts.map(c => `${c.start_time}–${c.end_time}`).join(', ')}`);
    }

    // Auto-create customer if walk-in with name/phone but no account
    let resolvedCustomerId = customer_id || null;
    if (!resolvedCustomerId && customer_name) {
      const existing = await query(
        'SELECT id FROM customers WHERE phone = $1 LIMIT 1',
        [customer_phone]
      );
      if (existing.rows.length) {
        resolvedCustomerId = existing.rows[0].id;
      } else {
        const newCust = await query(
          `INSERT INTO customers (name, phone, branch_id) VALUES ($1, $2, $3) RETURNING id`,
          [customer_name, customer_phone || null, branch_id]
        );
        resolvedCustomerId = newCust.rows[0].id;
      }
    }

    const result = await query(
      `INSERT INTO appointments (branch_id, customer_id, staff_id, service_id, start_time, end_time, notes, channel, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [branch_id, resolvedCustomerId, staff_id, service_id, start_time, end_time, notes || null, channel, req.user?.id || null]
    );

    const appt = result.rows[0];

    // Enrich for socket payload
    const enriched = await _enrichAppointment(appt.id);

    // Real-time push
    emitAppointmentCreated(branch_id, enriched);

    // Notification
    await query(
      `INSERT INTO notifications (branch_id, type, title, message, channel, reference_id, reference_type)
       VALUES ($1, 'booking_confirmation', $2, $3, 'in_app', $4, 'appointment')`,
      [
        branch_id,
        'New Appointment',
        `Appointment for ${enriched.customer_name || 'Walk-in'} — ${enriched.service_name} with ${enriched.staff_name}`,
        appt.id,
      ]
    );

    return R.created(res, enriched, 'Appointment created');
  } catch (err) {
    console.error('create appointment:', err);
    return R.error(res, 'Failed to create appointment', 500, err.message);
  }
};

// ── PATCH /api/appointments/:id ───────────────────────────
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const fields  = req.body;
    const allowed = ['status', 'notes', 'start_time', 'end_time', 'staff_id', 'service_id', 'channel'];
    const updates = [];
    const params  = [];
    let idx = 1;

    for (const key of allowed) {
      if (key in fields) {
        updates.push(`${key} = $${idx++}`);
        params.push(fields[key]);
      }
    }

    if (!updates.length) return R.badRequest(res, 'No valid fields to update');

    // Collision check if time is being changed
    if (fields.start_time || fields.end_time) {
      const current = await query('SELECT staff_id, start_time, end_time FROM appointments WHERE id=$1', [id]);
      if (!current.rows.length) return R.notFound(res, 'Appointment');
      const row = current.rows[0];
      const newStart = fields.start_time || row.start_time;
      const newEnd   = fields.end_time   || row.end_time;
      const staffId  = fields.staff_id   || row.staff_id;
      const { hasConflict, conflicts } = await checkCollision(staffId, newStart, newEnd, id);
      if (hasConflict) {
        return R.conflict(res, `Slot conflict: ${conflicts.map(c => c.start_time).join(', ')}`);
      }
    }

    params.push(id);
    const result = await query(
      `UPDATE appointments SET ${updates.join(', ')}, updated_at=NOW() WHERE id=$${idx} RETURNING *`,
      params
    );

    if (!result.rows.length) return R.notFound(res, 'Appointment');

    const enriched = await _enrichAppointment(id);
    emitAppointmentUpdated(enriched.branch_id, enriched);

    return R.ok(res, enriched, 'Appointment updated');
  } catch (err) {
    console.error('update appointment:', err);
    return R.error(res, 'Failed to update appointment');
  }
};

// ── DELETE /api/appointments/:id ──────────────────────────
exports.remove = async (req, res) => {
  try {
    const result = await query(
      `UPDATE appointments SET status='cancelled', updated_at=NOW() WHERE id=$1 RETURNING id`,
      [req.params.id]
    );
    if (!result.rows.length) return R.notFound(res, 'Appointment');
    return R.ok(res, { id: req.params.id }, 'Appointment cancelled');
  } catch (err) {
    return R.error(res, 'Failed to cancel appointment');
  }
};

// ── Internal helper ───────────────────────────────────────
async function _enrichAppointment(id) {
  const result = await query(
    `SELECT a.*, c.name AS customer_name, c.phone AS customer_phone,
            s.name AS service_name, s.price AS service_price, s.duration_min,
            st.name AS staff_name, b.name AS branch_name
     FROM appointments a
     LEFT JOIN customers c ON c.id = a.customer_id
     LEFT JOIN services  s ON s.id = a.service_id
     LEFT JOIN staff    st ON st.id = a.staff_id
     LEFT JOIN branches  b ON b.id = a.branch_id
     WHERE a.id = $1`,
    [id]
  );
  return result.rows[0];
}
