import { useState } from 'react';
import { useApp } from '../../context/AppContext';

const STATUS_CONFIG = {
  confirmed: { label: 'Confirmed', cls: 'badge-confirmed' },
  pending: { label: 'Pending', cls: 'badge-pending' },
  completed: { label: 'Completed', cls: 'badge-completed' },
  cancelled: { label: 'Cancelled', cls: 'badge-cancelled' },
  'in-progress': { label: 'In Progress', cls: 'badge-in-progress' },
};

const STATUS_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['in-progress', 'cancelled'],
  'in-progress': ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export default function AppointmentCard({ appointment, onEdit }) {
  const { updateAppointment, deleteAppointment } = useApp();
  const [loading, setLoading] = useState(false);

  const sc = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.pending;
  const transitions = STATUS_TRANSITIONS[appointment.status] || [];

  const handleStatusChange = async (newStatus) => {
    setLoading(true);
    try {
      await updateAppointment(appointment.id, { ...appointment, status: newStatus });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete appointment for ${appointment.clientName}?`)) return;
    await deleteAppointment(appointment.id);
  };

  const initials = appointment.clientName?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??';

  return (
    <div className="appointment-card" style={{ opacity: loading ? 0.7 : 1 }}>
      {/* Time block */}
      <div className="appt-time-block">
        <div className="appt-time">{appointment.time}</div>
        <div className="appt-duration">{appointment.duration}m</div>
      </div>

      <div className="appt-divider" />

      {/* Client avatar */}
      <div className="avatar" style={{ background: 'var(--gradient-brand)', color: 'white', fontSize: 13 }}>
        {initials}
      </div>

      {/* Info */}
      <div className="appt-info">
        <div className="appt-client">{appointment.clientName}</div>
        <div className="appt-service">{appointment.service}</div>
        <div className="appt-meta">
          <span className="appt-meta-item">🏢 {appointment.branch}</span>
          <span className="appt-meta-item">✂️ {appointment.stylist}</span>
          {appointment.phone && <span className="appt-meta-item">📱 {appointment.phone}</span>}
        </div>
      </div>

      {/* Price */}
      <div className="appt-price">₹{appointment.price?.toLocaleString('en-IN')}</div>

      {/* Status badge */}
      <span className={`badge ${sc.cls}`}>{sc.label}</span>

      {/* Actions */}
      <div className="appt-actions">
        {transitions.map(s => (
          <button key={s} className="btn btn-secondary btn-sm"
            onClick={() => handleStatusChange(s)} disabled={loading}
            title={`Mark as ${STATUS_CONFIG[s]?.label}`}
          >
            {s === 'confirmed' ? '✅' : s === 'in-progress' ? '▶' : s === 'completed' ? '✔' : '✖'}
          </button>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={() => onEdit?.(appointment)} title="Edit">✏️</button>
        <button className="btn btn-danger btn-sm" onClick={handleDelete} title="Delete">🗑</button>
      </div>
    </div>
  );
}
