import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import AppointmentCard from '../components/Appointments/AppointmentCard';
import BookingModal from '../components/Appointments/BookingModal';

const STATUSES = ['all', 'pending', 'confirmed', 'in-progress', 'completed', 'cancelled'];
const BRANCHES = ['all', 'Banjara Hills', 'Jubilee Hills', 'Gachibowli', 'Hitech City'];

export default function Appointments() {
  const { state, bookingModalOpen: ctxOpen, closeBooking } = useApp();
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [editAppt, setEditAppt] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Listen for global open-booking event (from sidebar/navbar)
  useEffect(() => {
    const handler = () => { setEditAppt(null); setShowModal(true); };
    window.addEventListener('open-booking', handler);
    return () => window.removeEventListener('open-booking', handler);
  }, []);

  // Sync context-triggered modal open (e.g. from Navbar button)
  // Using a ref-based approach avoids setState inside useEffect
  const isModalOpen = showModal || ctxOpen;

  const handleClose = () => { setShowModal(false); setEditAppt(null); closeBooking(); };
  const handleEdit = (appt) => { setEditAppt(appt); setShowModal(true); };

  let filtered = state.appointments;
  if (statusFilter !== 'all') filtered = filtered.filter(a => a.status === statusFilter);
  if (branchFilter !== 'all') filtered = filtered.filter(a => a.branch === branchFilter);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(a =>
      a.clientName?.toLowerCase().includes(q) ||
      a.service?.toLowerCase().includes(q) ||
      a.stylist?.toLowerCase().includes(q)
    );
  }

  // Sort by date then time
  filtered = [...filtered].sort((a, b) => {
    const da = new Date(`${a.date} ${a.time}`);
    const db = new Date(`${b.date} ${b.time}`);
    return db - da;
  });

  const countByStatus = STATUSES.reduce((acc, s) => {
    acc[s] = s === 'all' ? state.appointments.length : state.appointments.filter(a => a.status === s).length;
    return acc;
  }, {});

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Appointments</h1>
          <div className="page-subtitle">{filtered.length} of {state.appointments.length} shown</div>
        </div>
        <button
          id="add-appointment-btn"
          className="btn btn-primary"
          onClick={() => { setEditAppt(null); setShowModal(true); }}
        >
          ➕ New Appointment
        </button>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input
              className="form-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by client, service, stylist…"
              id="appointments-search"
            />
          </div>
          <select className="form-select" value={branchFilter} onChange={e => setBranchFilter(e.target.value)}
            style={{ width: 180 }}>
            {BRANCHES.map(b => <option key={b} value={b}>{b === 'all' ? 'All Branches' : b}</option>)}
          </select>
        </div>

        <div className="filter-tabs">
          {STATUSES.map(s => (
            <button
              key={s}
              className={`filter-tab${statusFilter === s ? ' active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')}
              {countByStatus[s] > 0 && <span style={{ marginLeft: 5, opacity: 0.6 }}>({countByStatus[s]})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <div className="empty-title">No appointments found</div>
          <div className="empty-desc">Try changing filters or create a new appointment.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {filtered.map(appt => (
            <AppointmentCard key={appt.id} appointment={appt} onEdit={handleEdit} />
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <BookingModal appointment={editAppt} onClose={handleClose} />
      )}
    </div>
  );
}
