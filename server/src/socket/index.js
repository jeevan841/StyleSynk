// server/src/socket/index.js
// Socket.IO event hub — all real-time events flow through here

let io = null;

function initSocket(ioInstance) {
  io = ioInstance;

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Join branch-specific room for scoped notifications
    socket.on('join:branch', (branchId) => {
      socket.join(`branch:${branchId}`);
    });

    // Join user-specific room for personal notifications
    socket.on('join:user', (userId) => {
      socket.join(`user:${userId}`);
    });

    // Join staff-specific room for commission alerts
    socket.on('join:staff', (staffId) => {
      socket.join(`staff:${staffId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
}

// ============================================================
// Emit helpers — called from controllers
// ============================================================

/** Broadcast new appointment to a branch room */
function emitAppointmentCreated(branchId, appointment) {
  if (!io) return;
  io.to(`branch:${branchId}`).emit('appointment:created', appointment);
}

/** Broadcast appointment status update to a branch room */
function emitAppointmentUpdated(branchId, appointment) {
  if (!io) return;
  io.to(`branch:${branchId}`).emit('appointment:updated', appointment);
}

/** Broadcast appointment cancellation to a branch room */
function emitAppointmentCancelled(branchId, data) {
  if (!io) return;
  io.to(`branch:${branchId}`).emit('appointment:cancelled', data);
}

/** Alert low-stock to branch room */
function emitLowStock(branchId, item) {
  if (!io) return;
  io.to(`branch:${branchId}`).emit('inventory:low', item);
}

/** Send notification to a specific user */
function emitNotification(userId, notification) {
  if (!io) return;
  io.to(`user:${userId}`).emit('notification:new', notification);
}

/** Broadcast bill:created to staff room (commission alert) */
function emitBillCreated(staffId, bill) {
  if (!io) return;
  io.to(`staff:${staffId}`).emit('bill:created', bill);
}

/** Broadcast bill closed event to branch */
function emitBillClosed(branchId, bill) {
  if (!io) return;
  io.to(`branch:${branchId}`).emit('bill:closed', bill);
}

module.exports = {
  initSocket,
  emitAppointmentCreated,
  emitAppointmentUpdated,
  emitAppointmentCancelled,
  emitLowStock,
  emitNotification,
  emitBillCreated,
  emitBillClosed,
};
