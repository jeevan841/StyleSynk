// client/src/pages/Calendar.jsx
// Full appointment calendar page — day/week view, Socket.IO reactive

import { useState } from 'react';
import CalendarGrid from '../components/CalendarGrid';
import { useAuth } from '../context/AuthContext';

export default function Calendar() {
  const { user } = useAuth();
  const [view, setView] = useState('day');
  const [staffFilter, setStaffFilter] = useState('');

  return (
    <div className="page-calendar">
      {/* Toolbar */}
      <div className="calendar-toolbar">
        <div className="view-toggle">
          <button
            className={`view-btn${view === 'day' ? ' active' : ''}`}
            onClick={() => setView('day')}
          >Day</button>
          <button
            className={`view-btn${view === 'week' ? ' active' : ''}`}
            onClick={() => setView('week')}
          >Week</button>
        </div>

        <div className="calendar-toolbar__right">
          <button
            className="btn btn-primary btn-sm"
            onClick={() => window.dispatchEvent(new CustomEvent('open-booking'))}
          >
            ➕ New Booking
          </button>
        </div>
      </div>

      {/* Calendar */}
      <CalendarGrid
        branchId={user?.branch_id}
        view={view}
        onSlotClick={(slot) => {
          // Pre-fill booking modal with clicked slot
          window.dispatchEvent(new CustomEvent('open-booking', {
            detail: { date: slot.date, hour: slot.hour },
          }));
        }}
        onAppointmentClick={(appt) => {
          console.log('Appointment clicked:', appt);
        }}
      />
    </div>
  );
}
