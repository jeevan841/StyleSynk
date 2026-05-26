// client/src/pages/Analytics.jsx
// Full analytics dashboard with Recharts charts

import { useState, useEffect } from 'react';
import { analyticsAPI } from '../api';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

function StatCard({ title, value, sub, icon, color = '#8b5cf6' }) {
  return (
    <div className="stat-card" style={{ '--card-accent': color }}>
      <div className="stat-icon" style={{ background: color + '22', color }}>
        {icon}
      </div>
      <div>
        <p className="stat-label">{title}</p>
        <p className="stat-value">{value}</p>
        {sub && <p className="stat-sub">{sub}</p>}
      </div>
    </div>
  );
}

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function Analytics() {
  const [days,       setDays]       = useState(30);
  const [overview,   setOverview]   = useState(null);
  const [revChart,   setRevChart]   = useState([]);
  const [apptChart,  setApptChart]  = useState([]);
  const [branchPerf, setBranchPerf] = useState([]);
  const [svcPop,     setSvcPop]     = useState([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      analyticsAPI.overview({ days }),
      analyticsAPI.revenueChart({ days }),
      analyticsAPI.appointmentsChart({ days }),
      analyticsAPI.branchPerformance({ days }),
      analyticsAPI.servicesPopularity({ days }),
    ]).then(([ov, rc, ac, bp, sp]) => {
      setOverview(ov);
      setRevChart(rc || []);
      setApptChart(ac || []);
      setBranchPerf(bp || []);
      setSvcPop(sp || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-loading">Loading analytics…</div>
      </div>
    );
  }

  const rev = overview?.revenue || {};
  const apt = overview?.appointments || {};
  const cust = overview?.customers || {};

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-sub">Business intelligence across all branches</p>
        </div>
        <div className="analytics-period-btns">
          {[7, 14, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`period-btn ${days === d ? 'active' : ''}`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        <StatCard title="Total Revenue"      value={fmt(rev.total_revenue)}    sub={`Today: ${fmt(rev.today_revenue)}`}  icon="₹" color="#8b5cf6" />
        <StatCard title="Total Bills"        value={rev.total_bills || 0}      sub={`Today: ${rev.today_bills || 0}`}    icon="🧾" color="#06b6d4" />
        <StatCard title="Avg Bill Value"     value={fmt(rev.avg_bill_value)}   sub={`Last ${days} days`}                icon="📊" color="#10b981" />
        <StatCard title="Appointments"       value={apt.total || 0}            sub={`Completed: ${apt.completed || 0}`} icon="📅" color="#f59e0b" />
        <StatCard title="Completion Rate"    value={apt.total > 0 ? Math.round((apt.completed/apt.total)*100)+'%' : '—'} sub={`No-show: ${apt.no_show || 0}`} icon="✅" color="#10b981" />
        <StatCard title="Customers"          value={cust.total_customers || 0} sub={`New: ${cust.new_customers || 0}`}  icon="👤" color="#a78bfa" />
      </div>

      {/* Revenue Chart */}
      <div className="chart-card">
        <h2 className="chart-title">Revenue Trend</h2>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={revChart} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={d => d?.slice(5)} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
              formatter={(v) => [fmt(v), 'Revenue']}
              labelFormatter={(l) => `Date: ${l}`}
            />
            <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} fill="url(#revGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Two-column charts */}
      <div className="two-col-charts">
        {/* Appointments Chart */}
        <div className="chart-card">
          <h2 className="chart-title">Appointments</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={apptChart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={d => d?.slice(5)} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }} />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
              <Bar dataKey="completed" fill="#10b981" radius={[4,4,0,0]} name="Completed" />
              <Bar dataKey="cancelled" fill="#ef4444" radius={[4,4,0,0]} name="Cancelled" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Services Popularity Pie */}
        <div className="chart-card">
          <h2 className="chart-title">Top Services</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={svcPop.slice(0,5)}
                dataKey="booking_count"
                nameKey="name"
                cx="50%" cy="50%"
                innerRadius={55} outerRadius={90}
                paddingAngle={3}
                label={({ name, percent }) => `${name?.split(' ')[0]} ${(percent*100).toFixed(0)}%`}
                labelLine={false}
              >
                {svcPop.slice(0,5).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Branch Performance Table */}
      {branchPerf.length > 0 && (
        <div className="chart-card">
          <h2 className="chart-title">Branch Performance</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Branch</th>
                  <th>City</th>
                  <th>Appointments</th>
                  <th>Bills</th>
                  <th>Revenue</th>
                  <th>Avg Ticket</th>
                  <th>Customers</th>
                </tr>
              </thead>
              <tbody>
                {branchPerf.map(b => (
                  <tr key={b.id}>
                    <td className="font-medium">{b.branch_name}</td>
                    <td>{b.city}</td>
                    <td>{b.appointments}</td>
                    <td>{b.bills}</td>
                    <td className="text-violet-400 font-semibold">{fmt(b.revenue)}</td>
                    <td>{fmt(b.avg_ticket)}</td>
                    <td>{b.unique_customers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Staff */}
      {overview?.top_staff?.length > 0 && (
        <div className="chart-card">
          <h2 className="chart-title">Top Stylists</h2>
          <div className="staff-leaderboard">
            {overview.top_staff.map((s, i) => (
              <div key={s.id} className="staff-rank-row">
                <span className="rank-badge" style={{ background: i === 0 ? '#f59e0b22' : '#1e293b', color: i === 0 ? '#f59e0b' : '#94a3b8' }}>
                  #{i + 1}
                </span>
                <div className="staff-rank-info">
                  <p className="font-medium text-white">{s.name}</p>
                  <p className="text-xs text-slate-400">{s.appointment_count} appointments</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-violet-400 font-semibold">{fmt(s.revenue_generated)}</p>
                  <p className="text-xs text-slate-400">⭐ {Number(s.rating || 5).toFixed(1)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
