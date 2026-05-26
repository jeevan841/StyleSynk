// server/src/routes/ai.js
const router = require('express').Router();
const { parseBooking } = require('../controllers/ai');

// Public — AI chat used before auth in customer portal
router.post('/parse-booking', parseBooking);

module.exports = router;
