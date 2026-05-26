import { useApp } from '../../context/AppContext';

const STATUS_CONFIG = {
  confirmed: { label: 'Confirmed', cls: 'badge-confirmed' },
  pending: { label: 'Pending', cls: 'badge-pending' },
  completed: { label: 'Completed', cls: 'badge-completed' },
  cancelled: { label: 'Cancelled', cls: 'badge-cancelled' },
  'in-progress': { label: 'In Progress', cls: 'badge-in-progress' },
};

export default function RecentAppointments() {
  const { state } = useApp();
  const recent = [...state.appointments]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6);

  return (
    <div className="chart-card">
      <div className="chart-title">
        <span>Recent Appointments</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>
          {state.appointments.length} total
        </span>
      </div>

      {recent.length === 0 ? (
        <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
          <div className="empty-icon">📅</div>
          <div className="empty-title">No appointments yet</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {recent.map(appt => {
            const sc = STATUS_CONFIG[appt.status] || STATUS_CONFIG.pending;
            return (
              <div key={appt.id} style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
              }}>
                <div className="avatar avatar-sm" style={{
                  background: 'var(--gradient-brand)', color: 'white', fontSize: 11
                }}>
                  {appt.clientName?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', truncate: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {appt.clientName}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {appt.service} · {appt.branch}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {appt.date}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{appt.time}</div>
                </div>
                <div><span className={`badge ${sc.cls}`}>{sc.label}</span></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
