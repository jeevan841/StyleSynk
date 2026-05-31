// client/src/components/Layout/Sidebar.jsx
// Updated sidebar with all new routes + real auth user

import { NavLink } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { path: '/',            icon: '⚡', label: 'Dashboard',    section: 'main' },
  { path: '/appointments',icon: '📅', label: 'Appointments', section: 'main' },
  { path: '/calendar',    icon: '🗓️', label: 'Calendar',     section: 'main' },
  { path: '/customers',   icon: '👥', label: 'Customers',    section: 'main' },
  { path: '/staff',       icon: '✂️', label: 'Staff',        section: 'main', roles: ['owner', 'branch_manager'] },
  { path: '/ai',          icon: '🤖', label: 'AI Assistant', section: 'main' },
  { path: '/pos',         icon: '💳', label: 'POS / Billing',section: 'ops'  },
  { path: '/inventory',   icon: '📦', label: 'Inventory',    section: 'ops',  roles: ['owner', 'branch_manager'] },
  { path: '/analytics',   icon: '📊', label: 'Analytics',    section: 'ops',  roles: ['owner', 'branch_manager'] },
  { path: '/branches',    icon: '🏢', label: 'Branches',     section: 'admin', roles: ['owner'] },
];

/** Returns true when the nav item should be visible for the given role. */
const isVisible = (item, role) => !item.roles || item.roles.includes(role);

/** Human-readable label for each role value. */
const ROLE_LABELS = { owner: 'Owner', branch_manager: 'Manager', receptionist: 'Receptionist' };

export default function Sidebar() {
  const { state } = useApp();
  const { user, logout } = useAuth();
  const pendingCount = state.appointments.filter(a => a.status === 'pending').length;

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || '?';

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">✦</div>
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-name">StyleSynk</span>
          <span className="sidebar-logo-tagline">Salon Management</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <span className="sidebar-section-label">Main Menu</span>
        {NAV_ITEMS.filter(i => i.section === 'main' && isVisible(i, user?.role)).map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
            {item.path === '/appointments' && pendingCount > 0 && (
              <span className="nav-badge">{pendingCount}</span>
            )}
          </NavLink>
        ))}

        <span className="sidebar-section-label">Operations</span>
        {NAV_ITEMS.filter(i => i.section === 'ops' && isVisible(i, user?.role)).map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}

        {NAV_ITEMS.filter(i => i.section === 'admin' && isVisible(i, user?.role)).length > 0 && (
          <>
            <span className="sidebar-section-label">Admin</span>
            {NAV_ITEMS.filter(i => i.section === 'admin' && isVisible(i, user?.role)).map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </>
        )}

        <span className="sidebar-section-label">Quick Actions</span>
        <button
          className="nav-item"
          onClick={() => window.dispatchEvent(new CustomEvent('open-booking'))}
          style={{ background: 'rgba(168,85,247,0.06)', border: '1px dashed rgba(168,85,247,0.25)' }}
        >
          <span className="nav-icon">➕</span>
          <span>New Appointment</span>
        </button>
      </nav>

      {/* User + Logout */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.name || 'User'}</div>
            <div className="user-role">{ROLE_LABELS[user?.role] ?? user?.role}</div>
          </div>
          <button
            onClick={logout}
            title="Logout"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, padding: 4 }}
          >
            🚪
          </button>
        </div>
      </div>
    </aside>
  );
}
