export default function StaffCard({ staff }) {
  const statusCls = staff.status === 'active' ? 'badge-active' : 'badge-on-leave';
  const statusLabel = staff.status === 'active' ? 'Active' : 'On Leave';

  return (
    <div className="staff-card" style={{ '--staff-color': staff.color }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: staff.color, borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', opacity: 0.8 }} />

      <div className="staff-card-header">
        <div className="avatar avatar-lg" style={{ background: staff.color + '30', color: staff.color, border: `2px solid ${staff.color}40` }}>
          {staff.avatar}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="staff-name">{staff.name}</div>
          <div className="staff-role">{staff.role}</div>
          <div className="staff-branch-tag" style={{ background: staff.color + '18', color: staff.color, border: `1px solid ${staff.color}30` }}>
            🏢 {staff.branch}
          </div>
        </div>
        <span className={`badge ${statusCls}`}>{statusLabel}</span>
      </div>

      <div className="staff-stats">
        <div className="staff-stat">
          <div className="staff-stat-value">⭐ {staff.rating}</div>
          <div className="staff-stat-label">Rating</div>
        </div>
        <div className="staff-stat">
          <div className="staff-stat-value">{staff.appointmentsToday}</div>
          <div className="staff-stat-label">Today</div>
        </div>
        <div className="staff-stat">
          <div className="staff-stat-value">{(staff.totalAppointments / 1000).toFixed(1)}k</div>
          <div className="staff-stat-label">Total</div>
        </div>
      </div>

      <div style={{ marginBottom: 'var(--space-3)' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
          Revenue this month
        </div>
        <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 20, fontWeight: 800, color: staff.color }}>
          ₹{( staff.revenue || 0).toLocaleString('en-IN')}
        </div>
        <div className="progress-bar" style={{ marginTop: 6 }}>
          <div className="progress-fill" style={{ width: `${Math.min((staff.revenue / 130000) * 100, 100)}%`, background: staff.color }} />
        </div>
      </div>

      <div className="specialties">
        {staff.specialties.map(s => (
          <span key={s} className="specialty-tag">{s}</span>
        ))}
      </div>

      <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-2)' }}>
        <a href={`tel:${staff.phone}`} className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
          📞 Call
        </a>
        <a href={`mailto:${staff.email}`} className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
          ✉️ Email
        </a>
      </div>
    </div>
  );
}
