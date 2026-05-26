export default function StatsCard({ icon, label, value, trend, trendUp, color, bgColor }) {
  return (
    <div className="stats-card" style={{ '--card-color': color }}>
      <div className="stats-card-header">
        <div className="stats-icon" style={{ background: bgColor || `${color}18` }}>
          {icon}
        </div>
        {trend !== undefined && (
          <div className={`stats-trend ${trendUp ? 'trend-up' : 'trend-down'}`}>
            {trendUp ? '↑' : '↓'} {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="stats-value">{value}</div>
      <div className="stats-label">{label}</div>
      <div
        className="stats-card-glow"
        style={{
          position: 'absolute', top: 0, right: 0,
          width: 120, height: 120, borderRadius: '50%',
          background: color, opacity: 0.07,
          transform: 'translate(40%, -40%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
