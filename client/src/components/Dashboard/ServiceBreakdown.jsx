import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useApp } from '../../context/AppContext';

const COLORS = ['#a855f7', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#6366f1', '#f97316', '#34d399'];

// Declared outside the component so it's never recreated during render
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const total = payload[0]?.payload?.total ?? 1;
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)', padding: '8px 12px', fontSize: 12,
    }}>
      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{payload[0].name}</div>
      <div style={{ color: payload[0].payload.fill }}>
        {payload[0].value} bookings ({Math.round(payload[0].value / total * 100)}%)
      </div>
    </div>
  );
};

export default function ServiceBreakdown() {
  const { state } = useApp();

  const serviceCounts = state.appointments.reduce((acc, a) => {
    acc[a.service] = (acc[a.service] || 0) + 1;
    return acc;
  }, {});

  const rawData = Object.entries(serviceCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const total = rawData.reduce((s, d) => s + d.value, 0);

  // Attach total to each entry so CustomTooltip can access it without closure
  const data = rawData.map(d => ({ ...d, total }));

  return (
    <div className="chart-card">
      <div className="chart-title">
        <span>Services Breakdown</span>
      </div>

      {data.length === 0 ? (
        <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
          <div className="empty-icon">🍩</div>
          <div className="empty-title">No data yet</div>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                paddingAngle={3} dataKey="value">
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={CustomTooltip} />
            </PieChart>
          </ResponsiveContainer>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'var(--space-3)' }}>
            {data.map((item, i) => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.name}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{item.value}</span>
                <div className="progress-bar" style={{ width: 60 }}>
                  <div className="progress-fill" style={{
                    width: `${(item.value / total) * 100}%`,
                    background: COLORS[i % COLORS.length]
                  }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
