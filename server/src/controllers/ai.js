// server/src/controllers/ai.js
// Thin controller — delegates to ai/parser.js

const { parseBookingMessage } = require('../ai/parser');
const R = require('../utils/response');

exports.parseBooking = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      return R.badRequest(res, 'message is required and must be a non-empty string');
    }

    const result = await parseBookingMessage(message.trim());
    return R.ok(res, result.data, `Parsed via ${result.mode} mode`);
  } catch (err) {
    console.error('AI parse error:', err);
    return R.error(res, 'Failed to parse booking request', 500);
  }
};
