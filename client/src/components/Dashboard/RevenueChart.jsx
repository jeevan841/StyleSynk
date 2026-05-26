import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const data = [
  { month: 'Dec', revenue: 185000, appointments: 320 },
  { month: 'Jan', revenue: 210000, appointments: 380 },
  { month: 'Feb', revenue: 195000, appointments: 350 },
  { month: 'Mar', revenue: 258000, appointments: 445 },
  { month: 'Apr', revenue: 275000, appointments: 490 },
  { month: 'May', revenue: 342000, appointments: 580 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)',
      padding: '10px 14px',
      fontSize: 13,
    }}>
      <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontWeight: 600 }}>
            {p.name === 'revenue' ? `₹${p.value.toLocaleString('en-IN')}` : `${p.value} bookings`}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function RevenueChart() {
  return (
    <div className="chart-card">
      <div className="chart-title">
        <span>Revenue & Bookings Trend</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>Last 6 months</span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="apptGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="month" tick={{ fill: '#5a5a78', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#5a5a78', fontSize: 11 }} axisLine={false} tickLine={false}
            tickFormatter={v => v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : v} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="revenue" stroke="#a855f7" strokeWidth={2.5}
            fill="url(#revGrad)" name="revenue" dot={false} activeDot={{ r: 5, fill: '#a855f7' }} />
          <Area type="monotone" dataKey="appointments" stroke="#06b6d4" strokeWidth={2}
            fill="url(#apptGrad)" name="appointments" dot={false} activeDot={{ r: 5, fill: '#06b6d4' }} />
        </AreaChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', gap: 20, marginTop: 12, justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
          <span style={{ width: 24, height: 3, background: '#a855f7', borderRadius: 2, display: 'inline-block' }} />
          Revenue
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
          <span style={{ width: 24, height: 3, background: '#06b6d4', borderRadius: 2, display: 'inline-block' }} />
          Appointments
        </div>
      </div>
    </div>
  );
}
