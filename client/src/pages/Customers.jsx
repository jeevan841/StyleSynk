// client/src/pages/Customers.jsx
// Customer management — list, search, loyalty, membership details

import { useState, useEffect, startTransition } from 'react';
import { customersAPI } from '../api';
import { formatINR } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import { useAuth } from '../context/AuthContext';

const MEMBERSHIP_COLORS = {
  Silver:   { bg: 'rgba(148,163,184,0.15)', text: '#94a3b8', border: 'rgba(148,163,184,0.3)' },
  Gold:     { bg: 'rgba(251,191,36,0.12)',  text: '#fbbf24', border: 'rgba(251,191,36,0.3)' },
  Platinum: { bg: 'rgba(168,85,247,0.12)',  text: '#a855f7', border: 'rgba(168,85,247,0.3)' },
};

function CustomerCard({ customer, onClick }) {
  const initials = customer.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const mem      = MEMBERSHIP_COLORS[customer.membership_name];

  return (
    <div className="customer-card" onClick={() => onClick(customer)} role="button" tabIndex={0}>
      <div className="customer-card__avatar">{initials}</div>
      <div className="customer-card__info">
        <div className="customer-card__name">{customer.name}</div>
        <div className="customer-card__phone">{customer.phone || '—'}</div>
        <div className="customer-card__email">{customer.email || '—'}</div>
      </div>
      <div className="customer-card__meta">
        {customer.membership_name && (
          <span
            className="membership-badge"
            style={mem ? { color: mem.text, background: mem.bg, border: `1px solid ${mem.border}` } : {}}
          >
            {customer.membership_name === 'Platinum' ? '💎' : customer.membership_name === 'Gold' ? '🥇' : '🥈'}
            &nbsp;{customer.membership_name}
          </span>
        )}
        <div className="loyalty-points">
          <span className="loyalty-icon">⭐</span>
          <span>{(customer.loyalty_points || 0).toLocaleString('en-IN')} pts</span>
        </div>
        <div className="customer-since">Joined {formatDate(customer.created_at)}</div>
      </div>
    </div>
  );
}

function CustomerDrawer({ customer, onClose }) {
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!customer) return;
    // Fetch appointment history for this customer
    const controller = new AbortController();
    fetch(`/api/appointments?customer_id=${customer.id}&limit=20`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      signal: controller.signal,
    })
      .then(r => r.json())
      .then(r => { setLoadingHistory(false); setHistory(r.data || []); })
      .catch(() => setLoadingHistory(false));
    startTransition(() => setLoadingHistory(true));
    return () => controller.abort();
  }, [customer]);

  if (!customer) return null;

  const cashValue = Math.floor((customer.loyalty_points || 0) / 10);

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <div className="drawer__header">
          <div className="drawer__avatar">
            {customer.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="drawer__name">{customer.name}</h2>
            <div className="drawer__sub">{customer.email || customer.phone}</div>
          </div>
          <button className="drawer__close" onClick={onClose}>✕</button>
        </div>

        <div className="drawer__body">
          {/* Loyalty */}
          <div className="drawer-section">
            <div className="section-title">Loyalty & Membership</div>
            <div className="loyalty-card">
              <div className="loyalty-card__points">
                <span className="points-number">{(customer.loyalty_points || 0).toLocaleString('en-IN')}</span>
                <span className="points-label">Points</span>
              </div>
              <div className="loyalty-card__value">≈ {formatINR(cashValue, 0)} value</div>
              {customer.membership_name && (
                <div className="loyalty-card__membership">
                  {customer.membership_name} Member · {customer.discount_percent}% discount
                </div>
              )}
            </div>
          </div>

          {/* Appointment history */}
          <div className="drawer-section">
            <div className="section-title">Visit History</div>
            {loadingHistory ? (
              <div className="drawer-loading">Loading…</div>
            ) : history.length === 0 ? (
              <div className="drawer-empty">No visits yet</div>
            ) : (
              <div className="history-list">
                {history.map(appt => (
                  <div key={appt.id} className="history-item">
                    <div className="history-item__service">{appt.service_name || '—'}</div>
                    <div className="history-item__staff">with {appt.staff_name || '—'}</div>
                    <div className="history-item__date">{formatDate(appt.start_time)}</div>
                    <span className={`status-chip status-chip--${appt.status}`}>{appt.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Customers() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [selected,  setSelected]  = useState(null);
  const [filter,    setFilter]    = useState('all'); // all | silver | gold | platinum

  useEffect(() => {
    customersAPI.getAll({ branch_id: user?.branch_id, search })
      .then(data => { setLoading(false); setCustomers(Array.isArray(data) ? data : []); })
      .catch(console.error);
    startTransition(() => setLoading(true));
  }, [search, user?.branch_id]);

  const filtered = customers.filter(c => {
    if (filter === 'all') return true;
    return c.membership_name?.toLowerCase() === filter;
  });

  const totalLoyalty = customers.reduce((s, c) => s + (c.loyalty_points || 0), 0);
  const memberCount  = customers.filter(c => c.membership_name).length;

  return (
    <div className="page-customers">
      {/* Summary bar */}
      <div className="customers-summary">
        <div className="summary-chip">
          <span className="summary-chip__icon">👥</span>
          <span className="summary-chip__val">{customers.length}</span>
          <span className="summary-chip__lbl">Total Clients</span>
        </div>
        <div className="summary-chip">
          <span className="summary-chip__icon">💳</span>
          <span className="summary-chip__val">{memberCount}</span>
          <span className="summary-chip__lbl">Members</span>
        </div>
        <div className="summary-chip">
          <span className="summary-chip__icon">⭐</span>
          <span className="summary-chip__val">{totalLoyalty.toLocaleString('en-IN')}</span>
          <span className="summary-chip__lbl">Total Points Issued</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="customers-toolbar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            placeholder="Search by name or phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-tabs">
          {['all','silver','gold','platinum'].map(f => (
            <button
              key={f}
              className={`filter-tab${filter === f ? ' active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="customers-grid">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="customer-card skeleton-card" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">👥</div>
          <div className="empty-state__title">No customers found</div>
          <div className="empty-state__sub">Try adjusting your search or filter</div>
        </div>
      ) : (
        <div className="customers-grid">
          {filtered.map(c => (
            <CustomerCard key={c.id} customer={c} onClick={setSelected} />
          ))}
        </div>
      )}

      {/* Drawer */}
      <CustomerDrawer customer={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
