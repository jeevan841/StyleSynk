// server/src/controllers/appointments.js
// Full appointment CRUD — uses createAppointmentSafe for concurrency-safe booking

const { query, getClient }       = require('../config/db');
const { createAppointmentSafe,
        checkCollision }         = require('../services/collision');
const { insertNotification }     = require('../services/notification');
const { emitAppointmentCreated,
        emitAppointmentUpdated,
        emitAppointmentCancelled } = require('../socket');
const R = require('../utils/response');
const { getDateRange, addMinutes, formatIST } = require('../utils/dateUtils');

// ── GET /api/appointments ──────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { branch_id, date, status, staff_id, customer_id,
            limit = 100, offset = 0 } = req.query;

    let sql = `
      SELECT a.*,
             c.name        AS customer_name,
             c.phone       AS customer_phone,
             c.loyalty_points,
             s.name        AS service_name,
             s.duration_min,
             s.price       AS service_price,
             st.name       AS staff_name,
             st.rating     AS staff_rating,
             b.name        AS branch_name
      FROM appointments a
      LEFT JOIN customers c  ON c.id  = a.customer_id
      LEFT JOIN services  s  ON s.id  = a.service_id
      LEFT JOIN staff     st ON st.id = a.staff_id
      LEFT JOIN branches  b  ON b.id  = a.branch_id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    const scopedBranch = req.user?.role !== 'owner'
      ? req.user?.branch_id
      : (branch_id || null);

    if (scopedBranch) { sql += ` AND a.branch_id   = $${idx++}`; params.push(scopedBranch); }
    if (date)         { sql += ` AND DATE(a.start_time AT TIME ZONE 'Asia/Kolkata') = $${idx++}`; params.push(date); }
    if (status)       { sql += ` AND a.status       = $${idx++}`; params.push(status); }
    if (staff_id)     { sql += ` AND a.staff_id     = $${idx++}`; params.push(staff_id); }
    if (customer_id)  { sql += ` AND a.customer_id  = $${idx++}`; params.push(customer_id); }

    // Stylist can only see their own schedule
    if (req.user?.role === 'stylist' && req.user?.staff_id) {
      sql += ` AND a.staff_id = $${idx++}`;
      params.push(req.user.staff_id);
    }

    sql += ` ORDER BY a.start_time ASC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);
    return R.ok(res, result.rows);
  } catch (err) {
    console.error('appointments.getAll:', err);
    return R.error(res, 'Failed to fetch appointments');
  }
};

// ── GET /api/appointments/availability ────────────────────
// Returns available 30-min slots for a stylist on a given date
exports.getAvailability = async (req, res) => {
  try {
    const { staff_id, date, service_id } = req.query;
    if (!staff_id || !date) {
      return R.badRequest(res, 'staff_id and date are required');
    }

    // Determine slot duration from service
    let slotMin = 30;
    if (service_id) {
      const svcRes = await query('SELECT duration_min FROM services WHERE id=$1', [service_id]);
      if (svcRes.rows.length) slotMin = svcRes.rows[0].duration_min;
    }

    // Fetch existing appointments for that stylist on that date
    const existingRes = await query(
      `SELECT start_time, end_time, status FROM appointments
       WHERE staff_id = $1
         AND DATE(start_time AT TIME ZONE 'Asia/Kolkata') = $2
         AND status NOT IN ('cancelled','no_show')`,
      [staff_id, date]
    );
    const existing = existingRes.rows;

    // Generate slots 9:00 AM → 8:00 PM IST
    const dayStart = new Date(`${date}T03:30:00.000Z`); // 9:00 AM IST = 3:30 UTC
    const dayEnd   = new Date(`${date}T14:30:00.000Z`); // 8:00 PM IST = 14:30 UTC
    const slots    = [];

    let current = new Date(dayStart);
    while (current < dayEnd) {
      const slotEnd = addMinutes(current, slotMin);
      if (slotEnd > dayEnd) break;

      const { pureCollisionCheck } = require('../services/collision');
      const taken = pureCollisionCheck(existing, current.toISOString(), slotEnd.toISOString());

      slots.push({
        start:     current.toISOString(),
        end:       slotEnd.toISOString(),
        start_ist: formatIST(current),
        end_ist:   formatIST(slotEnd),
        available: !taken,
      });

      current = addMinutes(current, slotMin);
    }

    return R.ok(res, { staff_id, date, slot_duration_min: slotMin, slots });
  } catch (err) {
    console.error('appointments.getAvailability:', err);
    return R.error(res, 'Failed to fetch availability');
  }
};

// ── GET /api/appointments/:id ──────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const result = await query(
      `SELECT a.*,
              c.name  AS customer_name, c.phone AS customer_phone, c.loyalty_points,
              s.name  AS service_name,  s.duration_min, s.price AS service_price,
              st.name AS staff_name,    st.rating,
              b.name  AS branch_name
       FROM appointments a
       LEFT JOIN customers c  ON c.id  = a.customer_id
       LEFT JOIN services  s  ON s.id  = a.service_id
       LEFT JOIN staff     st ON st.id = a.staff_id
       LEFT JOIN branches  b  ON b.id  = a.branch_id
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
// Uses pg_advisory_xact_lock for concurrency-safe booking
exports.create = async (req, res) => {
  try {
    const {
      branch_id, staff_id, service_id,
      start_time, end_time,
      customer_id, customer_name, customer_phone,
      notes, channel = 'walk_in', source,
    } = req.body;

    if (!branch_id || !staff_id || !service_id || !start_time || !end_time) {
      return R.badRequest(res, 'branch_id, staff_id, service_id, start_time, end_time required');
    }
    if (new Date(end_time) <= new Date(start_time)) {
      return R.badRequest(res, 'end_time must be after start_time');
    }

    // Auto-create or lookup walk-in customer
    let resolvedCustomerId = customer_id || null;
    if (!resolvedCustomerId && customer_name) {
      const existing = await query(
        'SELECT id FROM customers WHERE phone=$1 LIMIT 1',
        [customer_phone]
      );
      if (existing.rows.length) {
        resolvedCustomerId = existing.rows[0].id;
      } else {
        const newCust = await query(
          `INSERT INTO customers (name, phone, branch_id) VALUES ($1,$2,$3) RETURNING id`,
          [customer_name, customer_phone || null, branch_id]
        );
        resolvedCustomerId = newCust.rows[0].id;
      }
    }

    // ── CONCURRENCY-SAFE booking ───────────────────────────
    const result = await createAppointmentSafe({
      branch_id,
      customer_id:  resolvedCustomerId,
      staff_id,
      service_id,
      start_time,
      end_time,
      source:       source || channel,
      notes,
      created_by:   req.user?.id || null,
    });

    // Advisory lock detected a conflict
    if (result.error) {
      return res.status(409).json({
        success: false,
        error:   result.error,
        message: result.message,
        conflicts: result.conflicts,
      });
    }

    const appt = result.data;

    // Enrich for socket payload + response
    const enriched = await _enrichAppointment(appt.id);

    // Real-time push to branch room
    emitAppointmentCreated(branch_id, enriched);

    // Insert notification
    await insertNotification({
      branch_id,
      type:    'booking_confirmation',
      title:   'New Appointment',
      message: `${enriched.customer_name || 'Walk-in'} booked ${enriched.service_name} with ${enriched.staff_name}`,
      reference_id:   appt.id,
      reference_type: 'appointment',
    });

    return R.created(res, enriched, 'Appointment created');
  } catch (err) {
    console.error('appointments.create:', err);
    return R.error(res, 'Failed to create appointment', 500, err.message);
  }
};

// ── PUT /api/appointments/:id ─────────────────────────────
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = ['status','notes','start_time','end_time','staff_id','service_id','channel'];
    const updates = [];
    const params  = [];
    let idx = 1;

    for (const key of allowed) {
      if (key in req.body) {
        updates.push(`${key} = $${idx++}`);
        params.push(req.body[key]);
      }
    }
    if (!updates.length) return R.badRequest(res, 'No valid fields to update');

    // Collision check if rescheduling
    if (req.body.start_time || req.body.end_time || req.body.staff_id) {
      const cur = await query(
        'SELECT staff_id, start_time, end_time FROM appointments WHERE id=$1', [id]
      );
      if (!cur.rows.length) return R.notFound(res, 'Appointment');
      const row = cur.rows[0];
      const { hasConflict, conflicts } = await checkCollision(
        req.body.staff_id   || row.staff_id,
        req.body.start_time || row.start_time,
        req.body.end_time   || row.end_time,
        id  // exclude self
      );
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
    console.error('appointments.update:', err);
    return R.error(res, 'Failed to update appointment');
  }
};

// ── DELETE /api/appointments/:id ──────────────────────────
exports.remove = async (req, res) => {
  try {
    const result = await query(
      `UPDATE appointments SET status='cancelled', updated_at=NOW() WHERE id=$1 RETURNING id, branch_id`,
      [req.params.id]
    );
    if (!result.rows.length) return R.notFound(res, 'Appointment');
    emitAppointmentCancelled(result.rows[0].branch_id, { id: req.params.id });
    return R.ok(res, { id: req.params.id }, 'Appointment cancelled');
  } catch (err) {
    return R.error(res, 'Failed to cancel appointment');
  }
};

// ── Internal helpers ──────────────────────────────────────
async function _enrichAppointment(id) {
  const r = await query(
    `SELECT a.*,
            c.name   AS customer_name,  c.phone AS customer_phone, c.loyalty_points,
            s.name   AS service_name,   s.price AS service_price,  s.duration_min,
            st.name  AS staff_name,     st.rating,
            b.name   AS branch_name
     FROM appointments a
     LEFT JOIN customers c  ON c.id  = a.customer_id
     LEFT JOIN services  s  ON s.id  = a.service_id
     LEFT JOIN staff     st ON st.id = a.staff_id
     LEFT JOIN branches  b  ON b.id  = a.branch_id
     WHERE a.id = $1`,
    [id]
  );
  return r.rows[0];
}
