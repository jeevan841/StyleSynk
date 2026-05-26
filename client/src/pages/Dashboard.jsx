import { useApp } from '../context/AppContext';
import StatsCard from '../components/Dashboard/StatsCard';
import RevenueChart from '../components/Dashboard/RevenueChart';
import RecentAppointments from '../components/Dashboard/RecentAppointments';
import ServiceBreakdown from '../components/Dashboard/ServiceBreakdown';

export default function Dashboard() {
  const { state } = useApp();
  const { appointments, branches, staff, clients } = state;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppts = appointments.filter(a => a.date === todayStr);
  const revenue = appointments
    .filter(a => a.status === 'completed')
    .reduce((s, a) => s + (a.price || 0), 0);
  const totalRevenue = branches.reduce((s, b) => s + b.monthlyRevenue, 0);

  return (
    <div>
      {/* Greeting banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(6,182,212,0.06) 100%)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-6) var(--space-8)',
        marginBottom: 'var(--space-8)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, Ananya! 👋
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
            Here's what's happening across all 4 branches today.
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 32, fontWeight: 900,
            background: 'var(--gradient-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ₹{(totalRevenue / 1000).toFixed(0)}k
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Combined monthly revenue</div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatsCard
          icon="📅" label="Today's Appointments" value={todayAppts.length || appointments.length}
          trend={12} trendUp color="#a855f7"
        />
        <StatsCard
          icon="✅" label="Completed Today"
          value={todayAppts.filter(a => a.status === 'completed').length || appointments.filter(a => a.status === 'completed').length}
          trend={8} trendUp color="#10b981"
        />
        <StatsCard
          icon="👥" label="Active Clients" value={clients.length}
          trend={5} trendUp color="#06b6d4"
        />
        <StatsCard
          icon="💰" label="Revenue (Completed)"
          value={`₹${(revenue / 1000).toFixed(1)}k`}
          trend={15} trendUp color="#f59e0b"
        />
        <StatsCard
          icon="✂️" label="Total Staff" value={staff.length}
          trend={0} trendUp color="#ec4899"
        />
        <StatsCard
          icon="🏢" label="Active Branches" value={branches.length}
          color="#6366f1"
        />
      </div>

      {/* Charts row */}
      <div className="dashboard-grid" style={{ marginBottom: 'var(--space-6)' }}>
        <RevenueChart />
        <ServiceBreakdown />
      </div>

      {/* Recent appointments */}
      <RecentAppointments />

      {/* Branch performance */}
      <div style={{ marginTop: 'var(--space-6)' }}>
        <div className="chart-card">
          <div className="chart-title">Branch Performance</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
            {branches.map(branch => (
              <div key={branch.id} style={{
                padding: 'var(--space-4)', background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: branch.color }} />
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{branch.name}</span>
                </div>
                <div style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 22, fontWeight: 800, color: branch.color }}>
                  ₹{(branch.monthlyRevenue / 1000).toFixed(0)}k
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {branch.totalAppointments} bookings · ⭐ {branch.rating}
                </div>
                <div className="progress-bar" style={{ marginTop: 'var(--space-3)' }}>
                  <div className="progress-fill" style={{
                    width: `${(branch.monthlyRevenue / 400000) * 100}%`, background: branch.color
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
