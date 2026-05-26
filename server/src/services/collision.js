// server/src/services/collision.js
// Appointment slot collision detection
// Two patterns:
//   1. checkCollision()      — basic DB query (for reschedule checks outside a transaction)
//   2. createAppointmentSafe() — advisory lock + transaction guarantees no double-booking

const { getClient } = require('../config/db');

// ── Advisory lock helper ──────────────────────────────────
// pg_advisory_xact_lock requires a BIGINT.
// We fold a UUID into 64 bits by XOR-ing two 32-byte halves.
function hashStaffId(uuidStr) {
  // Remove hyphens: '550e8400-e29b-41d4-a716-446655440000' → hex string
  const hex = uuidStr.replace(/-/g, '');
  // Take first 16 hex chars as one BigInt and XOR with last 16 chars
  const hi = BigInt('0x' + hex.slice(0, 16));
  const lo = BigInt('0x' + hex.slice(16, 32));
  // XOR then mask to signed 64-bit range expected by PostgreSQL
  const mask = (1n << 63n) - 1n;           // max positive int8
  const result = (hi ^ lo) & mask;
  return result.toString();                  // pass as string; pg driver casts to int8
}

// ── createAppointmentSafe ─────────────────────────────────
/**
 * Concurrency-safe appointment creation.
 * Pattern: BEGIN → pg_advisory_xact_lock(staff) → collision check → INSERT → COMMIT
 *
 * Two simultaneous requests for the same stylist will serialize at the
 * advisory lock; the second will wait, then see the first's committed row
 * during its own collision check and return SLOT_TAKEN.
 *
 * @param {object} data
 * @param {string} data.branch_id
 * @param {string} data.customer_id
 * @param {string} data.staff_id
 * @param {string} data.service_id
 * @param {string} data.start_time   — ISO 8601
 * @param {string} data.end_time     — ISO 8601
 * @param {string} [data.source]     — channel: walk_in | phone | ai_chat | ...
 * @param {string} [data.notes]
 * @param {string} [data.created_by] — user UUID
 * @returns {{ data: object }|{ error: string, message: string }}
 */
async function createAppointmentSafe(data) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Advisory lock scoped to this stylist's UUID
    // Blocks any other concurrent request for the same staff_id
    const lockKey = hashStaffId(data.staff_id);
    await client.query('SELECT pg_advisory_xact_lock($1::bigint)', [lockKey]);

    // Collision check — inside the transaction so it sees committed state
    const conflict = await client.query(
      `SELECT id, start_time, end_time
       FROM appointments
       WHERE staff_id  = $1
         AND status   NOT IN ('cancelled', 'no_show')
         AND start_time <  $3
         AND end_time   >  $2`,
      [data.staff_id, data.start_time, data.end_time]
    );

    if (conflict.rows.length > 0) {
      await client.query('ROLLBACK');
      return {
        error:   'SLOT_TAKEN',
        message: 'This slot was just booked. Please choose another time.',
        conflicts: conflict.rows,
      };
    }

    // Safe to insert
    const result = await client.query(
      `INSERT INTO appointments
         (branch_id, customer_id, staff_id, service_id,
          start_time, end_time, status, channel, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'confirmed', $7, $8, $9)
       RETURNING *`,
      [
        data.branch_id,
        data.customer_id  || null,
        data.staff_id,
        data.service_id,
        data.start_time,
        data.end_time,
        data.source       || data.channel || 'walk_in',
        data.notes        || null,
        data.created_by   || null,
      ]
    );

    await client.query('COMMIT');
    return { data: result.rows[0] };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── checkCollision ────────────────────────────────────────
/**
 * Non-locking collision check — use for reschedule pre-validation
 * or UI availability hints. Not safe under concurrency for final booking.
 *
 * @param {string} staffId
 * @param {string} startTime
 * @param {string} endTime
 * @param {string|null} excludeId   — exclude this appointment (for reschedule)
 * @param {object|null} dbClient    — optional pg client (for use inside a transaction)
 * @returns {{ hasConflict: boolean, conflicts: Array }}
 */
async function checkCollision(staffId, startTime, endTime, excludeId = null, dbClient = null) {
  const { query } = dbClient
    ? { query: (sql, p) => dbClient.query(sql, p) }
    : require('../config/db');

  const params = [staffId, startTime, endTime];
  let sql = `
    SELECT id, start_time, end_time, status,
           (SELECT name FROM customers WHERE id = appointments.customer_id) AS customer_name
    FROM appointments
    WHERE staff_id   = $1
      AND status NOT IN ('cancelled', 'no_show')
      AND start_time <  $3
      AND end_time   >  $2
  `;

  if (excludeId) {
    params.push(excludeId);
    sql += ` AND id != $${params.length}`;
  }

  const result = await query(sql, params);
  return {
    hasConflict: result.rows.length > 0,
    conflicts:   result.rows,
  };
}

// ── pureCollisionCheck ────────────────────────────────────
/**
 * Synchronous in-memory collision check (unit-testable, no DB).
 * Use to validate availability before showing slots in the UI.
 *
 * @param {Array}  slots      — [{start_time, end_time, status}]
 * @param {string} startTime  — ISO string
 * @param {string} endTime    — ISO string
 * @returns {boolean}
 */
function pureCollisionCheck(slots, startTime, endTime) {
  const newStart = new Date(startTime).getTime();
  const newEnd   = new Date(endTime).getTime();

  return slots
    .filter(s => !['cancelled', 'no_show'].includes(s.status))
    .some(s => {
      const existStart = new Date(s.start_time).getTime();
      const existEnd   = new Date(s.end_time).getTime();
      return newStart < existEnd && newEnd > existStart;
    });
}

module.exports = { createAppointmentSafe, checkCollision, pureCollisionCheck, hashStaffId };
