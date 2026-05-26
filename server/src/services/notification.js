// server/src/services/notification.js
// Shared notification service — insert to DB + emit via Socket.IO
// Use this from any controller instead of raw INSERT + emit separately.

const { query } = require('../config/db');

let _io = null;

/**
 * setIO — called once from socket/index.js to inject the io instance
 * @param {import('socket.io').Server} io
 */
function setIO(io) {
  _io = io;
}

/**
 * insertNotification — inserts a notification record and emits via Socket.IO
 *
 * @param {object} opts
 * @param {string}  [opts.user_id]        — for personal notifications (user room)
 * @param {string}  [opts.branch_id]      — for branch-wide notifications
 * @param {string}   opts.type            — booking_confirmation | low_stock | bill | commission
 * @param {string}   opts.title
 * @param {string}   opts.message
 * @param {string}  [opts.channel]        — default: in_app
 * @param {string}  [opts.reference_id]
 * @param {string}  [opts.reference_type]
 * @param {object}  [opts.dbClient]       — optional pg client for use inside a transaction
 * @returns {object} inserted notification row
 */
async function insertNotification(opts) {
  const {
    user_id        = null,
    branch_id      = null,
    type,
    title,
    message,
    channel        = 'in_app',
    reference_id   = null,
    reference_type = null,
    dbClient       = null,
  } = opts;

  const db = dbClient
    ? (sql, p) => dbClient.query(sql, p)
    : query;

  const result = await db(
    `INSERT INTO notifications
       (user_id, branch_id, type, title, message, channel, reference_id, reference_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [user_id, branch_id, type, title, message, channel, reference_id, reference_type]
  );

  const notif = result.rows[0];

  // Emit to the appropriate Socket.IO room
  if (_io && notif) {
    if (user_id) {
      _io.to(`user:${user_id}`).emit('notification:new', notif);
    }
    if (branch_id) {
      _io.to(`branch:${branch_id}`).emit('notification:new', notif);
    }
  }

  return notif;
}

module.exports = { insertNotification, setIO };
