import { useState } from 'react';
import { useApp } from '../context/AppContext';
import ClientCard from '../components/Clients/ClientCard';

const STATUSES = ['All', 'VIP', 'Regular', 'New'];
const BRANCHES = ['All', 'Banjara Hills', 'Jubilee Hills', 'Gachibowli', 'Hitech City'];

export default function Clients() {
  const { state } = useApp();
  const [statusFilter, setStatusFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const [search, setSearch] = useState('');

  let filtered = state.clients;
  if (statusFilter !== 'All') filtered = filtered.filter(c => c.status === statusFilter);
  if (branchFilter !== 'All') filtered = filtered.filter(c => c.branch === branchFilter);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(c =>
      c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q)
    );
  }

  const totalSpend = state.clients.reduce((s, c) => s + c.totalSpend, 0);
  const vipCount = state.clients.filter(c => c.status === 'VIP').length;
  const totalVisits = state.clients.reduce((s, c) => s + c.totalVisits, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Clients</h1>
          <div className="page-subtitle">{filtered.length} clients shown</div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 20, fontWeight: 800, color: 'var(--brand-primary-light)' }}>
              ₹{(totalSpend / 1000).toFixed(1)}k
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total lifetime spend</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 20, fontWeight: 800, color: '#f59e0b' }}>
              👑 {vipCount}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>VIP clients</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 20, fontWeight: 800, color: '#10b981' }}>
              {totalVisits}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total visits</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input className="form-input" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone, email…" id="clients-search" />
        </div>
        <div className="filter-tabs">
          {STATUSES.map(s => (
            <button key={s} className={`filter-tab${statusFilter === s ? ' active' : ''}`}
              onClick={() => setStatusFilter(s)}>
              {s}
            </button>
          ))}
        </div>
        <div className="filter-tabs">
          {BRANCHES.map(b => (
            <button key={b} className={`filter-tab${branchFilter === b ? ' active' : ''}`}
              onClick={() => setBranchFilter(b)}>
              {b}
            </button>
          ))}
        </div>
      </div>

      {state.loading.clients ? (
        <div className="loading-container"><div className="loading-spinner" /><span>Loading clients…</span></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <div className="empty-title">No clients found</div>
          <div className="empty-desc">Try adjusting your search or filters.</div>
        </div>
      ) : (
        <div className="client-grid">
          {filtered.map(c => <ClientCard key={c.id} client={c} />)}
        </div>
      )}
    </div>
  );
}
