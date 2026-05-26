// server/src/routes/auth.js
const router = require('express').Router();
const { register, login, me, logout } = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

router.post('/register', register);
router.post('/login',    login);
router.get('/me',        verifyToken, me);
router.post('/logout',   verifyToken, logout);

module.exports = router;
