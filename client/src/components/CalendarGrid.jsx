// client/src/components/CalendarGrid.jsx
// Google-Calendar-style time grid — fixed px rows, appointment blocks, live "now" line

import { useState, useEffect, useRef } from 'react';
import { useAppointments } from '../hooks/useAppointments';
import { formatTime, formatDate, isToday } from '../utils/formatDate';
import { useAuth } from '../context/AuthContext';

// ── Constants ────────────────────────────────────────────────
const HOUR_HEIGHT   = 64;          // px per hour
const START_HOUR    = 8;           // 8 AM
const END_HOUR      = 21;          // 9 PM
const TOTAL_HOURS   = END_HOUR - START_HOUR;
const GRID_HEIGHT   = TOTAL_HOURS * HOUR_HEIGHT;

const HOURS = Array.from({ length: TOTAL_HOURS }, (_, i) => i + START_HOUR);

const STATUS_META = {
  pending:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.18)',  label: 'Pending' },
  confirmed:   { color: '#a855f7', bg: 'rgba(168,85,247,0.18)',  label: 'Confirmed' },
  in_progress: { color: '#3b82f6', bg: 'rgba(59,130,246,0.18)', label: 'In Progress' },
  completed:   { color: '#10b981', bg: 'rgba(16,185,129,0.18)', label: 'Completed' },
  cancelled:   { color: '#6b7280', bg: 'rgba(107,114,128,0.15)',label: 'Cancelled' },
  no_show:     { color: '#ef4444', bg: 'rgba(239,68,68,0.18)',   label: 'No Show' },
};

// ── Helpers ──────────────────────────────────────────────────

/** Convert ISO timestamp → fractional IST hour (e.g. 14.5 = 2:30 PM IST) */
function toISTHour(iso) {
  const d = new Date(iso);
  // UTC + 5.5 h
  const utcMin = d.getUTCHours() * 60 + d.getUTCMinutes();
  const istMin = utcMin + 330; // +5:30
  return istMin / 60;
}

/** Top offset in px for a given IST hour value */
function hourToPx(h) {
  return Math.max(0, (h - START_HOUR) * HOUR_HEIGHT);
}

/**
 * Detect overlapping appointments and assign column indices so they
 * can be rendered side-by-side instead of on top of each other.
 */
function layoutColumns(appts) {
  const sorted = [...appts].sort(
    (a, b) => toISTHour(a.start_time) - toISTHour(b.start_time)
  );
  const cols = [];   // each col = array of appt end-times
  const result = sorted.map(appt => {
    const startH = toISTHour(appt.start_time);
    const endH   = toISTHour(appt.end_time);
    let col = cols.findIndex(endTime => endTime <= startH);
    if (col === -1) { col = cols.length; cols.push(endH); }
    else            { cols[col] = endH; }
    return { appt, col };
  });
  const totalCols = cols.length || 1;
  return result.map(({ appt, col }) => ({ appt, col, totalCols }));
}

// ── CurrentTimeLine component ────────────────────────────────
function CurrentTimeLine() {
  const [top, setTop] = useState(null);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const istMin = (now.getUTCHours() * 60 + now.getUTCMinutes()) + 330;
      const istH   = istMin / 60;
      if (istH >= START_HOUR && istH <= END_HOUR) {
        setTop(hourToPx(istH));
      }
    };
    update();
    const id = setInterval(update, 30000); // refresh every 30s
    return () => clearInterval(id);
  }, []);

  if (top === null) return null;

  return (
    <div className="cal-now-line" style={{ top }}>
      <div className="cal-now-dot" />
    </div>
  );
}

// ── AppointmentBlock component ───────────────────────────────
function AppointmentBlock({ appt, col, totalCols, onClick }) {
  const startH  = toISTHour(appt.start_time);
  const endH    = toISTHour(appt.end_time);
  const topPx   = hourToPx(startH);
  const rawH    = Math.max(0, endH - startH);
  const heightPx = Math.max(28, rawH * HOUR_HEIGHT - 3);

  const meta    = STATUS_META[appt.status] || STATUS_META.confirmed;
  const colW    = 100 / totalCols;
  const left    = `calc(${col * colW}% + 3px)`;
  const width   = `calc(${colW}% - 6px)`;
  const isShort = heightPx < 46;
  const isVeryShort = heightPx < 32;

  return (
    <div
      className="cal-block"
      style={{
        top:      topPx,
        height:   heightPx,
        left,
        width,
        background:  meta.bg,
        borderLeft:  `3px solid ${meta.color}`,
        '--block-color': meta.color,
      }}
      onClick={() => onClick?.(appt)}
      title={`${appt.customer_name || 'Walk-in'}\n${appt.service_name || ''}\n${formatTime(appt.start_time)} – ${formatTime(appt.end_time)}\nStatus: ${meta.label}`}
    >
      {isVeryShort ? (
        <span className="cal-block__compact">
          {formatTime(appt.start_time)} · {appt.customer_name || 'Walk-in'}
        </span>
      ) : isShort ? (
        <>
          <div className="cal-block__time">{formatTime(appt.start_time)}</div>
          <div className="cal-block__name">{appt.customer_name || 'Walk-in'}</div>
        </>
      ) : (
        <>
          <div className="cal-block__time">
            {formatTime(appt.start_time)} – {formatTime(appt.end_time)}
          </div>
          <div className="cal-block__name">{appt.customer_name || 'Walk-in'}</div>
          {appt.service_name && (
            <div className="cal-block__service">{appt.service_name}</div>
          )}
          {appt.staff_name && !isShort && (
            <div className="cal-block__staff">✂️ {appt.staff_name}</div>
          )}
          <div className="cal-block__badge" style={{ background: meta.color }}>
            {meta.label}
          </div>
        </>
      )}
    </div>
  );
}

// ── DayColumn component ──────────────────────────────────────
function DayColumn({ day, appointments, onSlotClick, onAppointmentClick, showDayLabel }) {
  const dayStr = new Date(day).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const dayAppts = appointments.filter(a => {
    const aDate = new Date(a.start_time).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    return aDate === dayStr;
  });

  const laid = layoutColumns(dayAppts);
  const today = isToday(day);

  return (
    <div className={`cal-day-col${today ? ' cal-day-col--today' : ''}`}>
      {showDayLabel && (
        <div className={`cal-day-header${today ? ' cal-day-header--today' : ''}`}>
          <span className="cal-day-weekday">
            {new Date(day).toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'Asia/Kolkata' })}
          </span>
          <span className={`cal-day-num${today ? ' cal-day-num--today' : ''}`}>
            {new Date(day).toLocaleDateString('en-IN', { day: 'numeric', timeZone: 'Asia/Kolkata' })}
          </span>
        </div>
      )}

      {/* Clickable hour slots (background layer) */}
      <div className="cal-slots-layer" style={{ height: GRID_HEIGHT }}>
        {HOURS.map(h => (
          <div
            key={h}
            className={`cal-slot${h % 2 === 0 ? ' cal-slot--even' : ''}`}
            style={{ height: HOUR_HEIGHT }}
            onClick={() => onSlotClick?.({ date: dayStr, hour: h })}
          >
            <div className="cal-slot-half" style={{ height: HOUR_HEIGHT / 2 }} />
          </div>
        ))}

        {/* Now line (only on today's column) */}
        {today && <CurrentTimeLine />}

        {/* Appointment blocks */}
        {laid.map(({ appt, col, totalCols }) => (
          <AppointmentBlock
            key={appt.id}
            appt={appt}
            col={col}
            totalCols={totalCols}
            onClick={onAppointmentClick}
          />
        ))}

        {dayAppts.length === 0 && (
          <div className="cal-empty-day">
            <span>No appointments</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main CalendarGrid ────────────────────────────────────────
export default function CalendarGrid({
  branchId,
  staffId,
  view = 'day',
  selectedDate,
  onAppointmentClick,
  onSlotClick,
}) {
  const { user }  = useAuth();
  const scrollRef = useRef(null);
  const [currentDate, setCurrentDate] = useState(selectedDate || new Date());

  const dateStr = new Date(currentDate).toLocaleDateString('en-CA', {
    timeZone: 'Asia/Kolkata',
  });

  const { appointments, loading } = useAppointments({
    branch_id: branchId || user?.branch_id,
    staff_id:  staffId  || undefined,
    date:      dateStr,
  });

  // Scroll to 9 AM on mount
  useEffect(() => {
    if (scrollRef.current) {
      const offset = hourToPx(9) - 32;
      scrollRef.current.scrollTop = offset;
    }
  }, []);

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

  const weekDays = view === 'week'
    ? Array.from({ length: 7 }, (_, i) => {
        const d   = new Date(currentDate);
        const dow = d.getDay();
        d.setDate(d.getDate() - dow + i);
        return d;
      })
    : [currentDate];

  const totalAppts = appointments.length;

  return (
    <div className="cal-grid-wrap">
      {/* ── Top bar ── */}
      <div className="cal-topbar">
        <div className="cal-nav-group">
          <button className="cal-nav-btn" onClick={prev} aria-label="Previous">‹</button>
          <div className="cal-topbar__title">
            <span className="cal-topbar__date">{formatDate(currentDate)}</span>
            {isToday(currentDate) && <span className="cal-today-pill">Today</span>}
          </div>
          <button className="cal-nav-btn" onClick={next} aria-label="Next">›</button>
        </div>

        <div className="cal-topbar__right">
          {loading && <span className="cal-loading-dot" title="Loading…" />}
          <span className="cal-appt-count">{totalAppts} appt{totalAppts !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* ── Grid wrapper (time axis + columns, scrollable) ── */}
      <div className="cal-scroll-area" ref={scrollRef}>
        <div className="cal-inner" style={{ height: GRID_HEIGHT }}>

          {/* Time axis */}
          <div className="cal-time-axis">
            {HOURS.map(h => (
              <div key={h} className="cal-hour-tick" style={{ height: HOUR_HEIGHT }}>
                <span className="cal-hour-label">
                  {h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div className="cal-cols-wrap">
            {weekDays.map((day, i) => (
              <DayColumn
                key={i}
                day={day}
                appointments={appointments}
                onSlotClick={onSlotClick}
                onAppointmentClick={onAppointmentClick}
                showDayLabel={view === 'week'}
              />
            ))}
          </div>

        </div>
      </div>

      {/* ── Legend ── */}
      <div className="cal-legend">
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <span key={key} className="cal-legend-item">
            <span className="cal-legend-dot" style={{ background: meta.color }} />
            {meta.label}
          </span>
        ))}
      </div>
    </div>
  );
}
