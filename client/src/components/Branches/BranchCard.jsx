export default function BranchCard({ branch }) {
  const revenueK = (branch.monthlyRevenue / 1000).toFixed(0);

  return (
    <div className="branch-card">
      <div className="branch-card-image-placeholder"
        style={{ background: `linear-gradient(135deg, ${branch.color}30, ${branch.color}08)` }}>
        <span>🏢</span>
      </div>

      <div className="branch-card-body">
        <div className="branch-card-header">
          <div>
            <div className="branch-name">{branch.name}</div>
            <div className="branch-address">📍 {branch.address}</div>
            <div className="branch-manager">👤 {branch.manager}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <span className="badge badge-active">Active</span>
            <div className="rating-badge">
              ⭐ {branch.rating}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 'var(--space-3)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>🕐 {branch.openHours}</span>
          <span style={{ color: 'var(--border-subtle)' }}>·</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>📞 {branch.phone}</span>
        </div>

        <div className="branch-stats">
          <div className="branch-stat">
            <div className="branch-stat-value" style={{ color: branch.color }}>₹{revenueK}k</div>
            <div className="branch-stat-label">Revenue/mo</div>
          </div>
          <div className="branch-stat">
            <div className="branch-stat-value">{branch.totalStaff}</div>
            <div className="branch-stat-label">Staff</div>
          </div>
          <div className="branch-stat">
            <div className="branch-stat-value">{branch.totalAppointments}</div>
            <div className="branch-stat-label">Bookings</div>
          </div>
        </div>

        <div style={{ marginTop: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>
            <span>Monthly Target</span>
            <span style={{ color: branch.color, fontWeight: 600 }}>{Math.round((branch.monthlyRevenue / 400000) * 100)}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${Math.min((branch.monthlyRevenue / 400000) * 100, 100)}%`, background: branch.color }} />
          </div>
        </div>

        <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-secondary btn-sm" style={{ flex: 1 }}>View Details</button>
          <button className="btn btn-ghost btn-sm" style={{ flex: 1 }}>Staff →</button>
        </div>
      </div>
    </div>
  );
}
