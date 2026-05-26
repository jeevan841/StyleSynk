// server/src/utils/response.js
// Consistent JSON response helpers used by all controllers

const ok = (res, data, message = 'Success', status = 200) =>
  res.status(status).json({ success: true, data, message });

const created = (res, data, message = 'Created') =>
  res.status(201).json({ success: true, data, message });

const error = (res, message = 'An error occurred', status = 500, details = null) =>
  res.status(status).json({ success: false, error: message, ...(details ? { details } : {}) });

const notFound = (res, resource = 'Resource') =>
  res.status(404).json({ success: false, error: `${resource} not found` });

const badRequest = (res, message = 'Bad request') =>
  res.status(400).json({ success: false, error: message });

const forbidden = (res, message = 'Access denied') =>
  res.status(403).json({ success: false, error: message });

const conflict = (res, message = 'Conflict') =>
  res.status(409).json({ success: false, error: message });

module.exports = { ok, created, error, notFound, badRequest, forbidden, conflict };
