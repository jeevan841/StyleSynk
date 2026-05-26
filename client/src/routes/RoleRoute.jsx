// client/src/routes/RoleRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_HIERARCHY = { owner: 5, branch_manager: 4, receptionist: 3, stylist: 2, customer: 1 };

/**
 * RoleRoute — wraps ProtectedRoute with a minimum role check
 * Usage: <RoleRoute minRole="branch_manager"><AnalyticsPage /></RoleRoute>
 */
export default function RoleRoute({ children, minRole, allowedRoles }) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const userLevel = ROLE_HIERARCHY[user?.role] || 0;

  if (minRole && userLevel < (ROLE_HIERARCHY[minRole] || 0)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-slate-400">You need <span className="text-violet-400">{minRole}</span> access or higher.</p>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-slate-400">This page requires: {allowedRoles.join(', ')}</p>
      </div>
    );
  }

  return children;
}
