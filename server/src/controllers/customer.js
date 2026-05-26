// server/src/controllers/customer.js
// Customer self-service portal — own bookings, loyalty, profile

const { query }               = require('../config/db');
const { createAppointmentSafe } = require('../services/collision');
const { insertNotification }  = require('../services/notification');
const R = require('../utils/response');

// ── GET /api/customer/appointments ────────────────────────
exports.getMyAppointments = async (req, res) => {
  try {
    const customerId = req.user?.customer_id;
    if (!customerId) return R.badRequest(res, 'No customer profile linked to this account');

    const result = await query(
      `SELECT a.*,
              s.name  AS service_name, s.price AS service_price, s.duration_min,
              st.name AS staff_name,   st.rating,
              b.name  AS branch_name,  b.address
       FROM appointments a
       LEFT JOIN services s  ON s.id  = a.service_id
       LEFT JOIN staff    st ON st.id = a.staff_id
       LEFT JOIN branches b  ON b.id  = a.branch_id
       WHERE a.customer_id = $1
       ORDER BY a.start_time DESC
       LIMIT 50`,
      [customerId]
    );
    return R.ok(res, result.rows);
  } catch (err) {
    return R.error(res, 'Failed to fetch appointments');
  }
};

// ── POST /api/customer/book ───────────────────────────────
exports.book = async (req, res) => {
  try {
    const customerId = req.user?.customer_id;
    const { branch_id, staff_id, service_id, start_time, end_time, notes } = req.body;

    if (!branch_id || !staff_id || !service_id || !start_time || !end_time) {
      return R.badRequest(res, 'branch_id, staff_id, service_id, start_time, end_time required');
    }
    if (new Date(end_time) <= new Date(start_time)) {
      return R.badRequest(res, 'end_time must be after start_time');
    }

    const result = await createAppointmentSafe({
      branch_id,
      customer_id: customerId,
      staff_id,
      service_id,
      start_time,
      end_time,
      source:      'online',
      notes,
      created_by:  req.user?.id,
    });

    if (result.error) {
      return res.status(409).json({ success: false, error: result.error, message: result.message });
    }

    await insertNotification({
      user_id:        req.user?.id,
      type:           'booking_confirmation',
      title:          'Booking Confirmed!',
      message:        `Your appointment has been confirmed for ${new Date(start_time).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
      reference_id:   result.data.id,
      reference_type: 'appointment',
    });

    return R.created(res, result.data, 'Appointment booked successfully');
  } catch (err) {
    console.error('customer.book:', err);
    return R.error(res, 'Failed to book appointment', 500, err.message);
  }
};

// ── PUT /api/customer/reschedule ──────────────────────────
exports.reschedule = async (req, res) => {
  try {
    const customerId = req.user?.customer_id;
    const { appointment_id, start_time, end_time } = req.body;

    if (!appointment_id || !start_time || !end_time) {
      return R.badRequest(res, 'appointment_id, start_time, end_time required');
    }

    // Verify ownership
    const apptCheck = await query(
      'SELECT id, staff_id, customer_id, status FROM appointments WHERE id=$1',
      [appointment_id]
    );
    if (!apptCheck.rows.length) return R.notFound(res, 'Appointment');
    const appt = apptCheck.rows[0];
    if (appt.customer_id !== customerId) return R.forbidden(res, 'Not your appointment');
    if (['cancelled','completed'].includes(appt.status)) {
      return R.badRequest(res, 'Cannot reschedule a ' + appt.status + ' appointment');
    }

    // Reschedule: cancel + rebook
    await query(
      `UPDATE appointments SET status='cancelled', updated_at=NOW() WHERE id=$1`,
      [appointment_id]
    );

    const result = await createAppointmentSafe({
      branch_id:  appt.branch_id,
      customer_id: customerId,
      staff_id:   req.body.staff_id || appt.staff_id,
      service_id: appt.service_id,
      start_time,
      end_time,
      source:     'online',
      notes:      `Rescheduled from appointment ${appointment_id}`,
      created_by: req.user?.id,
    });

    if (result.error) {
      // Restore original if rebook fails
      await query(
        `UPDATE appointments SET status='confirmed', updated_at=NOW() WHERE id=$1`,
        [appointment_id]
      );
      return res.status(409).json({ success: false, error: result.error, message: result.message });
    }

    return R.ok(res, result.data, 'Appointment rescheduled');
  } catch (err) {
    return R.error(res, 'Failed to reschedule appointment');
  }
};

// ── DELETE /api/customer/cancel ───────────────────────────
exports.cancel = async (req, res) => {
  try {
    const customerId = req.user?.customer_id;
    const { appointment_id } = req.body;

    const result = await query(
      `UPDATE appointments SET status='cancelled', updated_at=NOW()
       WHERE id=$1 AND customer_id=$2 AND status NOT IN ('cancelled','completed')
       RETURNING id`,
      [appointment_id, customerId]
    );
    if (!result.rows.length) {
      return R.badRequest(res, 'Appointment not found, already cancelled, or not yours');
    }
    return R.ok(res, { id: appointment_id }, 'Appointment cancelled');
  } catch (err) {
    return R.error(res, 'Failed to cancel appointment');
  }
};

// ── GET /api/customer/loyalty ─────────────────────────────
exports.getLoyalty = async (req, res) => {
  try {
    const customerId = req.user?.customer_id;
    if (!customerId) return R.badRequest(res, 'No customer profile linked');

    const [balanceRes, historyRes] = await Promise.all([
      query(`SELECT loyalty_points, membership_id,
                    m.name AS membership_name, m.discount_percent
             FROM customers c
             LEFT JOIN memberships m ON m.id = c.membership_id
             WHERE c.id=$1`, [customerId]),
      query(`SELECT * FROM loyalty_points WHERE customer_id=$1
             ORDER BY created_at DESC LIMIT 20`, [customerId]),
    ]);

    const customer = balanceRes.rows[0];
    return R.ok(res, {
      current_balance:  customer?.loyalty_points || 0,
      membership:       customer?.membership_name || null,
      discount_percent: customer?.discount_percent || 0,
      cash_value:       Math.floor((customer?.loyalty_points || 0) / 10), // 10 pts = ₹1
      history:          historyRes.rows,
    });
  } catch (err) {
    return R.error(res, 'Failed to fetch loyalty data');
  }
};
