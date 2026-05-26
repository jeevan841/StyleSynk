// server/src/controllers/authController.js
// Auth: register, login, /me, logout

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { query } = require('../config/db');
const R = require('../utils/response');

// ── helpers ────────────────────────────────────────────────

function signToken(user) {
  return jwt.sign(
    {
      id:        user.id,
      email:     user.email,
      role:      user.role_name,
      branch_id: user.branch_id,
      name:      user.name,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// ── POST /api/auth/register ────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, email, password, role_name = 'receptionist', branch_id } = req.body;

    if (!name || !email || !password) {
      return R.badRequest(res, 'name, email and password are required');
    }
    if (password.length < 6) {
      return R.badRequest(res, 'Password must be at least 6 characters');
    }

    // Check email uniqueness
    const existing = await query('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
    if (existing.rows.length) {
      return R.conflict(res, 'Email already registered');
    }

    // Resolve role
    const roleRow = await query('SELECT id FROM roles WHERE name=$1', [role_name]);
    if (!roleRow.rows.length) {
      return R.badRequest(res, `Role '${role_name}' does not exist`);
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO users (name, email, password_hash, role_id, branch_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, branch_id, created_at`,
      [name, email.toLowerCase(), password_hash, roleRow.rows[0].id, branch_id || null]
    );

    const user = result.rows[0];
    const token = signToken({ ...user, role_name, branch_id });

    return R.created(res, { token, user: { id: user.id, name: user.name, email: user.email, role: role_name, branch_id: user.branch_id } }, 'Registration successful');
  } catch (err) {
    console.error('register error:', err);
    return R.error(res, 'Registration failed', 500, err.message);
  }
};

// ── POST /api/auth/login ───────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return R.badRequest(res, 'Email and password are required');
    }

    const result = await query(
      `SELECT u.id, u.name, u.email, u.password_hash, u.branch_id, u.is_active,
              r.name AS role_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );

    const user = result.rows[0];
    if (!user) return R.error(res, 'Invalid email or password', 401);
    if (!user.is_active) return R.error(res, 'Account deactivated. Contact admin.', 403);

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return R.error(res, 'Invalid email or password', 401);

    // Update last_login
    await query('UPDATE users SET last_login=NOW() WHERE id=$1', [user.id]);

    const token = signToken(user);

    return R.ok(res, {
      token,
      user: {
        id:        user.id,
        name:      user.name,
        email:     user.email,
        role:      user.role_name,
        branch_id: user.branch_id,
      },
    }, 'Login successful');
  } catch (err) {
    console.error('login error:', err);
    return R.error(res, 'Login failed', 500);
  }
};

// ── GET /api/auth/me ───────────────────────────────────────
exports.me = async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.name, u.email, u.branch_id, u.last_login,
              r.name AS role, b.name AS branch_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN branches b ON b.id = u.branch_id
       WHERE u.id = $1`,
      [req.user.id]
    );
    if (!result.rows.length) return R.notFound(res, 'User');
    return R.ok(res, result.rows[0]);
  } catch (err) {
    return R.error(res, 'Failed to fetch user', 500);
  }
};

// ── POST /api/auth/logout ──────────────────────────────────
// Stateless JWT — logout handled on client by discarding token
exports.logout = (req, res) => {
  return R.ok(res, null, 'Logged out successfully');
};
