import { useApp } from '../context/AppContext';
import BranchCard from '../components/Branches/BranchCard';

export default function Branches() {
  const { state } = useApp();
  const { branches } = state;

  const totalRevenue = branches.reduce((s, b) => s + b.monthlyRevenue, 0);
  const totalStaff = branches.reduce((s, b) => s + b.totalStaff, 0);
  const totalAppts = branches.reduce((s, b) => s + b.totalAppointments, 0);
  const avgRating = branches.length
    ? (branches.reduce((s, b) => s + b.rating, 0) / branches.length).toFixed(1)
    : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Branches</h1>
          <div className="page-subtitle">All Hyderabad locations</div>
        </div>
      </div>

      {/* Summary strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)',
        marginBottom: 'var(--space-8)',
        background: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(6,182,212,0.04))',
        border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-6)',
      }}>
        {[
          { label: 'Total Revenue', value: `₹${(totalRevenue / 1000).toFixed(0)}k`, icon: '💰', color: '#a855f7' },
          { label: 'Total Staff', value: totalStaff, icon: '✂️', color: '#06b6d4' },
          { label: 'Total Bookings', value: totalAppts.toLocaleString(), icon: '📅', color: '#10b981' },
          { label: 'Avg Rating', value: `⭐ ${avgRating}`, icon: '⭐', color: '#f59e0b' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
            <div style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 24, fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {state.loading.branches ? (
        <div className="loading-container"><div className="loading-spinner" /><span>Loading branches…</span></div>
      ) : (
        <div className="branch-grid">
          {branches.map(b => <BranchCard key={b.id} branch={b} />)}
        </div>
      )}
    </div>
  );
}
