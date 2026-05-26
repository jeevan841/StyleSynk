// client/src/components/CalendarGrid.jsx
// Day/week appointment calendar — Socket.IO reactive, real API data

import { useState, useEffect } from 'react';
import { useAppointments } from '../hooks/useAppointments';
import { formatTime, formatDate, isToday, toInputDateTime } from '../utils/formatDate';
import { useAuth } from '../context/AuthContext';

const STATUS_COLORS = {
  confirmed:   '#a855f7',
  in_progress: '#3b82f6',
  completed:   '#10b981',
  cancelled:   '#6b7280',
  no_show:     '#ef4444',
};

const HOURS = Array.from({ length: 12 }, (_, i) => i + 9); // 9 AM to 8 PM

export default function CalendarGrid({
  branchId,
  staffId,
  view       = 'day',       // 'day' | 'week'
  selectedDate,
  onAppointmentClick,
  onSlotClick,
}) {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(selectedDate || new Date());

  const dateStr = new Date(currentDate).toLocaleDateString('en-CA', {
    timeZone: 'Asia/Kolkata',
  }); // YYYY-MM-DD

  const { appointments, loading } = useAppointments({
    branch_id: branchId || user?.branch_id,
    staff_id:  staffId  || undefined,
    date:      dateStr,
  });

  // Navigate dates
  const prev = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - (view === 'week' ? 7 : 1));
    setCurrentDate(d);
  };
  const next = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + (view === 'week' ? 7 : 1));
    setCurrentDate(d);
  };

  // Build week days for week view
  const weekDays = view === 'week' ? Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentDate);
    const day = d.getDay(); // 0=Sun
    d.setDate(d.getDate() - day + i);
    return d;
  }) : [currentDate];

  // Position appointment on the grid
  const getApptStyle = (appt) => {
    const start   = new Date(appt.start_time);
    const end     = new Date(appt.end_time);
    const startH  = start.getUTCHours() + start.getUTCMinutes() / 60 + 5.5; // IST
    const endH    = end.getUTCHours()   + end.getUTCMinutes()   / 60 + 5.5;
    const top     = ((startH - 9) / 12) * 100;
    const height  = ((endH - startH) / 12) * 100;
    return {
      top:    `${Math.max(0, top)}%`,
      height: `${Math.max(2, height)}%`,
      background: STATUS_COLORS[appt.status] || STATUS_COLORS.confirmed,
    };
  };

  return (
    <div className="calendar-grid">
      {/* Header */}
      <div className="calendar-header">
        <button className="calendar-nav" onClick={prev}>‹</button>
        <div className="calendar-header__title">
          <span className="calendar-date">{formatDate(currentDate)}</span>
          {isToday(currentDate) && <span className="calendar-today-badge">Today</span>}
        </div>
        <button className="calendar-nav" onClick={next}>›</button>
      </div>

      {loading && <div className="calendar-loading">Loading appointments…</div>}

      {/* Grid */}
      <div className="calendar-body">
        {/* Time axis */}
        <div className="calendar-time-axis">
          {HOURS.map(h => (
            <div key={h} className="calendar-hour-label">
              {h > 12 ? `${h - 12} PM` : h === 12 ? '12 PM' : `${h} AM`}
            </div>
          ))}
        </div>

        {/* Columns — one per day */}
        <div className="calendar-columns">
          {weekDays.map((day, di) => {
            const dayStr = new Date(day).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            const dayAppts = appointments.filter(a => {
              const aDate = new Date(a.start_time).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
              return aDate === dayStr;
            });

            return (
              <div
                key={di}
                className={`calendar-column${isToday(day) ? ' calendar-column--today' : ''}`}
              >
                {/* Day label (week view) */}
                {view === 'week' && (
                  <div className="calendar-day-label">
                    {new Date(day).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' })}
                  </div>
                )}

                {/* Hour grid lines */}
                <div className="calendar-slots" style={{ position: 'relative', flex: 1 }}>
                  {HOURS.map(h => (
                    <div
                      key={h}
                      className="calendar-slot"
                      onClick={() => onSlotClick?.({ date: dayStr, hour: h })}
                    />
                  ))}

                  {/* Appointments */}
                  {dayAppts.map(appt => (
                    <div
                      key={appt.id}
                      className="calendar-appointment"
                      style={getApptStyle(appt)}
                      onClick={() => onAppointmentClick?.(appt)}
                      title={`${appt.customer_name} — ${appt.service_name}\n${formatTime(appt.start_time)} – ${formatTime(appt.end_time)}`}
                    >
                      <div className="cal-appt__time">
                        {formatTime(appt.start_time)}
                      </div>
                      <div className="cal-appt__name">
                        {appt.customer_name || 'Walk-in'}
                      </div>
                      <div className="cal-appt__service">
                        {appt.service_name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="calendar-legend">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <span key={status} className="legend-item">
            <span className="legend-dot" style={{ background: color }} />
            {status.replace('_', ' ')}
          </span>
        ))}
      </div>
    </div>
  );
}
