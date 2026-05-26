// client/src/components/Layout/Navbar.jsx
// Updated navbar with real auth user + notifications

import { useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

const PAGE_INFO = {
  '/':            { title: 'Dashboard',    subtitle: 'Overview of all branches' },
  '/appointments':{ title: 'Appointments', subtitle: 'Manage & track bookings' },
  '/calendar':    { title: 'Calendar',     subtitle: 'Day & week appointment view' },
  '/customers':   { title: 'Customers',    subtitle: 'Client profiles, loyalty & history' },
  '/staff':       { title: 'Staff',        subtitle: 'Team management & commissions' },
  '/branches':    { title: 'Branches',     subtitle: 'All Hyderabad locations' },
  '/ai':          { title: 'AI Assistant', subtitle: 'Smart booking via natural language' },
  '/analytics':   { title: 'Analytics',   subtitle: 'Revenue, bookings & performance' },
  '/inventory':   { title: 'Inventory',   subtitle: 'Per-branch stock management' },
  '/pos':         { title: 'Point of Sale',subtitle: 'Billing, GST & payments' },
};

export default function Navbar() {
  const location = useLocation();
  const { openBooking } = useApp();
  const { user } = useAuth();
  const info = PAGE_INFO[location.pathname] || { title: 'StyleSynk', subtitle: '' };

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || '?';

  return (
    <header className="navbar">
      <div className="navbar-left">
        <h1 className="navbar-title">{info.title}</h1>
        <span className="navbar-subtitle">{info.subtitle} &nbsp;·&nbsp; {dateStr}</span>
      </div>

      <div className="navbar-right">
        <button
          id="navbar-new-appointment"
          className="btn btn-primary btn-sm"
          onClick={openBooking}
        >
          ➕ New Booking
        </button>

        <button className="navbar-btn" title="Notifications">
          🔔
          <span className="notif-dot" />
        </button>

        <div className="user-avatar" style={{ width: 40, height: 40, fontSize: 15 }} title={user?.name}>
          {initials}
        </div>
      </div>
    </header>
  );
}
