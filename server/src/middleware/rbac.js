// server/src/middleware/rbac.js
// requireRole — RBAC enforcement after verifyToken
// Usage: router.get('/admin', verifyToken, requireRole('owner', 'branch_manager'), handler)

const ROLE_HIERARCHY = {
  owner:          5,
  branch_manager: 4,
  receptionist:   3,
  stylist:        2,
  customer:       1,
};

/**
 * requireRole(...roles) — middleware factory
 * Allows access if req.user.role matches any of the listed roles
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const userRole = req.user.role;
    if (allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: `Access denied. Required role: [${allowedRoles.join(', ')}]. Your role: ${userRole}`,
    });
  };
};

/**
 * requireMinRole(minRole) — allows the role and anything above it in hierarchy
 * e.g. requireMinRole('receptionist') allows receptionist, branch_manager, owner
 */
const requireMinRole = (minRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const minLevel  = ROLE_HIERARCHY[minRole]       || 0;

    if (userLevel >= minLevel) {
      return next();
    }
    return res.status(403).json({
      success: false,
      error: `Access denied. Minimum required role: ${minRole}`,
    });
  };
};

module.exports = { requireRole, requireMinRole };
