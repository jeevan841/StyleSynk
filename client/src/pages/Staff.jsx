import { useState } from 'react';
import { useApp } from '../context/AppContext';
import StaffCard from '../components/Staff/StaffCard';

const BRANCHES = ['All', 'Banjara Hills', 'Jubilee Hills', 'Gachibowli', 'Hitech City'];
const STATUSES = ['All', 'Active', 'On Leave'];

export default function Staff() {
  const { state } = useApp();
  const [branchFilter, setBranchFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');

  let filtered = state.staff;
  if (branchFilter !== 'All') filtered = filtered.filter(s => s.branch === branchFilter);
  if (statusFilter !== 'All') filtered = filtered.filter(s =>
    s.status === statusFilter.toLowerCase().replace(' ', '-')
  );
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(s =>
      s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q) ||
      s.specialties.some(sp => sp.toLowerCase().includes(q))
    );
  }

  const totalRevenue = state.staff.reduce((s, st) => s + st.revenue, 0);
  const avgRating = state.staff.length
    ? (state.staff.reduce((s, st) => s + st.rating, 0) / state.staff.length).toFixed(1)
    : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff</h1>
          <div className="page-subtitle">{filtered.length} team members shown</div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 20, fontWeight: 800, color: 'var(--brand-primary-light)' }}>
              ₹{(totalRevenue / 1000).toFixed(0)}k
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total team revenue</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 20, fontWeight: 800, color: '#f59e0b' }}>
              ⭐ {avgRating}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Average rating</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input className="form-input" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, role, specialty…" id="staff-search" />
        </div>
        <div className="filter-tabs">
          {BRANCHES.map(b => (
            <button key={b} className={`filter-tab${branchFilter === b ? ' active' : ''}`}
              onClick={() => setBranchFilter(b)}>
              {b}
            </button>
          ))}
        </div>
        <div className="filter-tabs">
          {STATUSES.map(s => (
            <button key={s} className={`filter-tab${statusFilter === s ? ' active' : ''}`}
              onClick={() => setStatusFilter(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {state.loading.staff ? (
        <div className="loading-container"><div className="loading-spinner" /><span>Loading staff…</span></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✂️</div>
          <div className="empty-title">No staff found</div>
          <div className="empty-desc">Try adjusting your filters.</div>
        </div>
      ) : (
        <div className="staff-grid">
          {filtered.map(s => <StaffCard key={s.id} staff={s} />)}
        </div>
      )}
    </div>
  );
}
