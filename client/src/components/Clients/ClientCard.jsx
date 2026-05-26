export default function ClientCard({ client }) {
  const statusCls = `badge-${client.status.toLowerCase()}`;
  const lastVisit = client.lastVisit
    ? new Date(client.lastVisit).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'N/A';

  return (
    <div className="client-card">
      <div className="client-card-header">
        <div className="avatar avatar-lg" style={{ background: client.color + '25', color: client.color, border: `2px solid ${client.color}35` }}>
          {client.avatar}
        </div>
        <div className="client-info-main">
          <div className="client-name">{client.name}</div>
          <div className="client-phone">📱 {client.phone}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
            📍 {client.branch}
          </div>
        </div>
        <span className={`badge ${statusCls}`}>{client.status}</span>
      </div>

      <div className="client-stats">
        <div>
          <div className="client-stat-value">{client.totalVisits}</div>
          <div className="client-stat-label">Total Visits</div>
        </div>
        <div>
          <div className="client-stat-value" style={{ color: client.color }}>
            ₹{(client.totalSpend / 1000).toFixed(1)}k
          </div>
          <div className="client-stat-label">Total Spend</div>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Last Visit</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{lastVisit}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Stylist</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {client.preferredStylist || 'Any'}
          </div>
        </div>
      </div>

      <div className="client-services">
        {client.preferredServices?.map(s => (
          <span key={s} className="client-service-tag">{s}</span>
        ))}
      </div>

      {client.notes && (
        <div style={{
          marginTop: 'var(--space-3)', padding: 'var(--space-3)',
          background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
          fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic',
          borderLeft: `3px solid ${client.color}50`
        }}>
          📝 {client.notes}
        </div>
      )}

      <div style={{ marginTop: 'var(--space-3)', display: 'flex', gap: 'var(--space-2)' }}>
        <button className="btn btn-secondary btn-sm" style={{ flex: 1 }}>📅 Book Now</button>
        <a href={`tel:${client.phone}`} className="btn btn-ghost btn-sm">📞</a>
      </div>
    </div>
  );
}
