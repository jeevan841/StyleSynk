// server/src/controllers/analyticsController.js
// All analytics queries — aggregated from appointments, bills, commissions, inventory

const { query } = require('../config/db');
const R = require('../utils/response');

// ── GET /api/analytics/overview ───────────────────────────
exports.overview = async (req, res) => {
  try {
    const { branch_id, days = 30 } = req.query;
    const scopedBranch = req.user?.role !== 'owner' ? req.user?.branch_id : (branch_id || null);
    const branchClause = scopedBranch ? `AND branch_id = '${scopedBranch}'` : '';

    const [revenue, appointments, customers, topStaff] = await Promise.all([
      query(`
        SELECT
          COALESCE(SUM(total_amount), 0)               AS total_revenue,
          COALESCE(SUM(total_amount) FILTER (WHERE DATE(paid_at) = CURRENT_DATE), 0) AS today_revenue,
          COUNT(*) FILTER (WHERE status='paid')         AS total_bills,
          COUNT(*) FILTER (WHERE DATE(paid_at)=CURRENT_DATE AND status='paid') AS today_bills,
          COALESCE(AVG(total_amount) FILTER (WHERE status='paid'), 0) AS avg_bill_value
        FROM bills
        WHERE created_at >= NOW() - INTERVAL '${parseInt(days)} days'
          AND status IN ('paid','refunded')
          ${branchClause}
      `),
      query(`
        SELECT
          COUNT(*)                                          AS total,
          COUNT(*) FILTER (WHERE status='completed')       AS completed,
          COUNT(*) FILTER (WHERE status='cancelled')       AS cancelled,
          COUNT(*) FILTER (WHERE status='no_show')         AS no_show,
          COUNT(*) FILTER (WHERE DATE(start_time) = CURRENT_DATE) AS today,
          COUNT(*) FILTER (WHERE start_time >= NOW() AND status NOT IN ('cancelled','no_show')) AS upcoming
        FROM appointments
        WHERE created_at >= NOW() - INTERVAL '${parseInt(days)} days'
          ${branchClause}
      `),
      query(`
        SELECT
          COUNT(*) AS total_customers,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '${parseInt(days)} days') AS new_customers
        FROM customers
        ${scopedBranch ? `WHERE branch_id = '${scopedBranch}'` : ''}
      `),
      query(`
        SELECT st.id, st.name, st.rating,
          COUNT(a.id) AS appointment_count,
          COALESCE(SUM(b.total_amount), 0) AS revenue_generated,
          COALESCE(SUM(c.commission_amt), 0) AS total_commission
        FROM staff st
        LEFT JOIN appointments a ON a.staff_id = st.id AND a.status = 'completed'
          AND a.start_time >= NOW() - INTERVAL '${parseInt(days)} days'
        LEFT JOIN bills b ON b.appointment_id = a.id AND b.status = 'paid'
        LEFT JOIN commissions c ON c.staff_id = st.id
          AND c.created_at >= NOW() - INTERVAL '${parseInt(days)} days'
        ${scopedBranch ? `WHERE st.branch_id = '${scopedBranch}'` : ''}
        GROUP BY st.id, st.name, st.rating
        ORDER BY appointment_count DESC
        LIMIT 5
      `),
    ]);

    return R.ok(res, {
      revenue:      revenue.rows[0],
      appointments: appointments.rows[0],
      customers:    customers.rows[0],
      top_staff:    topStaff.rows,
    });
  } catch (err) {
    console.error('analytics overview:', err);
    return R.error(res, 'Failed to fetch analytics overview');
  }
};

// ── GET /api/analytics/revenue-chart ──────────────────────
exports.revenueChart = async (req, res) => {
  try {
    const { branch_id, days = 30 } = req.query;
    const scopedBranch = req.user?.role !== 'owner' ? req.user?.branch_id : (branch_id || null);
    const branchClause = scopedBranch ? `AND branch_id = '${scopedBranch}'` : '';

    const result = await query(`
      SELECT
        DATE(paid_at AT TIME ZONE 'Asia/Kolkata') AS date,
        COALESCE(SUM(total_amount), 0)            AS revenue,
        COUNT(*)                                   AS bill_count
      FROM bills
      WHERE status = 'paid'
        AND paid_at >= NOW() - INTERVAL '${parseInt(days)} days'
        ${branchClause}
      GROUP BY DATE(paid_at AT TIME ZONE 'Asia/Kolkata')
      ORDER BY date ASC
    `);

    return R.ok(res, result.rows);
  } catch (err) {
    return R.error(res, 'Failed to fetch revenue chart');
  }
};

// ── GET /api/analytics/appointments-chart ─────────────────
exports.appointmentsChart = async (req, res) => {
  try {
    const { branch_id, days = 30 } = req.query;
    const scopedBranch = req.user?.role !== 'owner' ? req.user?.branch_id : (branch_id || null);
    const branchClause = scopedBranch ? `AND branch_id = '${scopedBranch}'` : '';

    const result = await query(`
      SELECT
        DATE(start_time AT TIME ZONE 'Asia/Kolkata') AS date,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status='completed') AS completed,
        COUNT(*) FILTER (WHERE status='cancelled') AS cancelled
      FROM appointments
      WHERE start_time >= NOW() - INTERVAL '${parseInt(days)} days'
        ${branchClause}
      GROUP BY DATE(start_time AT TIME ZONE 'Asia/Kolkata')
      ORDER BY date ASC
    `);

    return R.ok(res, result.rows);
  } catch (err) {
    return R.error(res, 'Failed to fetch appointments chart');
  }
};

// ── GET /api/analytics/branch-performance ─────────────────
exports.branchPerformance = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const result = await query(`
      SELECT
        br.id, br.name AS branch_name, br.city,
        COUNT(DISTINCT a.id) AS appointments,
        COUNT(DISTINCT b.id) AS bills,
        COALESCE(SUM(b.total_amount), 0) AS revenue,
        COALESCE(AVG(b.total_amount), 0) AS avg_ticket,
        COUNT(DISTINCT a.customer_id)    AS unique_customers
      FROM branches br
      LEFT JOIN appointments a ON a.branch_id = br.id
        AND a.created_at >= NOW() - INTERVAL '${parseInt(days)} days'
        AND a.status = 'completed'
      LEFT JOIN bills b ON b.branch_id = br.id
        AND b.status = 'paid'
        AND b.paid_at >= NOW() - INTERVAL '${parseInt(days)} days'
      WHERE br.is_active = TRUE
      GROUP BY br.id, br.name, br.city
      ORDER BY revenue DESC
    `);

    return R.ok(res, result.rows);
  } catch (err) {
    return R.error(res, 'Failed to fetch branch performance');
  }
};

// ── GET /api/analytics/services-popularity ────────────────
exports.servicesPopularity = async (req, res) => {
  try {
    const { branch_id, days = 30 } = req.query;
    const scopedBranch = req.user?.role !== 'owner' ? req.user?.branch_id : (branch_id || null);

    const result = await query(`
      SELECT
        s.id, s.name, s.category,
        COUNT(a.id) AS booking_count,
        COALESCE(SUM(s.price), 0) AS gross_revenue
      FROM services s
      LEFT JOIN appointments a ON a.service_id = s.id
        AND a.status = 'completed'
        AND a.start_time >= NOW() - INTERVAL '${parseInt(days)} days'
        ${scopedBranch ? `AND a.branch_id = '${scopedBranch}'` : ''}
      GROUP BY s.id, s.name, s.category
      ORDER BY booking_count DESC
      LIMIT 10
    `);

    return R.ok(res, result.rows);
  } catch (err) {
    return R.error(res, 'Failed to fetch service popularity');
  }
};
