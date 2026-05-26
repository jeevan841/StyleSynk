import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';

const SERVICES = [
  'Haircut', 'Hair Color', 'Hair Spa', 'Blowout',
  'Facial', 'Cleanup', 'Manicure', 'Pedicure',
  'Full Body Massage', 'Eyebrow Threading', 'Waxing (Full Body)', 'Bridal Package'
];

const SERVICE_PRICES = {
  'Haircut': 800, 'Hair Color': 3500, 'Hair Spa': 1500, 'Blowout': 1200,
  'Facial': 2000, 'Cleanup': 900, 'Manicure': 700, 'Pedicure': 900,
  'Full Body Massage': 4500, 'Eyebrow Threading': 200, 'Waxing (Full Body)': 2800, 'Bridal Package': 15000
};

const SERVICE_DURATIONS = {
  'Haircut': 45, 'Hair Color': 120, 'Hair Spa': 60, 'Blowout': 45,
  'Facial': 60, 'Cleanup': 30, 'Manicure': 45, 'Pedicure': 60,
  'Full Body Massage': 90, 'Eyebrow Threading': 15, 'Waxing (Full Body)': 90, 'Bridal Package': 300
};

const BRANCHES = ['Banjara Hills', 'Jubilee Hills', 'Gachibowli', 'Hitech City'];

const STAFF_BY_BRANCH = {
  'Banjara Hills': ['Divya Krishnan', 'Kavitha Rao'],
  'Gachibowli': ['Rohit Sharma', 'Arun Kumar'],
  'Jubilee Hills': ['Sneha Patel', 'Lakshmi Devi'],
  'Hitech City': ['Meera Iyer', 'Vijay Anand'],
};

const EMPTY_FORM = {
  clientName: '', phone: '', service: '', date: '', time: '',
  branch: '', stylist: '', price: '', duration: '', notes: '', status: 'pending'
};

export default function BookingModal({ appointment, onClose }) {
  const { createAppointment, updateAppointment, state } = useApp();
  const isEdit = !!appointment;

  const [form, setForm] = useState(isEdit ? { ...appointment } : { ...EMPTY_FORM, ...state.prefillData });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Wrapped in useCallback so references are stable for useEffect deps
  const resolveDate = useCallback((d) => {
    if (!d) return '';
    const lower = d.toLowerCase();
    const today = new Date();
    if (lower === 'today') return today.toISOString().split('T')[0];
    if (lower === 'tomorrow') {
      const t = new Date(today); t.setDate(t.getDate() + 1);
      return t.toISOString().split('T')[0];
    }
    return d;
  }, []);

  // Wrapped in useCallback so references are stable for useEffect deps
  const resolveTime = useCallback((t) => {
    if (!t) return '';
    const m = t.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    if (!m) return '';
    let h = parseInt(m[1]); const min = m[2] || '00'; const ampm = m[3].toUpperCase();
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${min}`;
  }, []);

  // Listen for AI fill events
  useEffect(() => {
    const handler = (e) => {
      const d = e.detail;
      setForm(prev => ({
        ...prev,
        clientName: d.customer_name || prev.clientName,
        phone: d.phone || prev.phone,
        service: d.service || prev.service,
        date: resolveDate(d.date) || prev.date,
        time: resolveTime(d.time) || prev.time,
        branch: d.branch || prev.branch,
        stylist: d.stylist_preference || prev.stylist,
        notes: d.notes || prev.notes,
        price: d.service ? SERVICE_PRICES[d.service] || '' : prev.price,
        duration: d.service ? SERVICE_DURATIONS[d.service] || '' : prev.duration,
      }));
    };
    window.addEventListener('ai-fill-booking', handler);
    return () => window.removeEventListener('ai-fill-booking', handler);
  }, [resolveDate, resolveTime]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updates = { [name]: value };
    if (name === 'service') {
      updates.price = SERVICE_PRICES[value] || '';
      updates.duration = SERVICE_DURATIONS[value] || '';
    }
    if (name === 'branch') updates.stylist = '';
    setForm(prev => ({ ...prev, ...updates }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.clientName || !form.service || !form.date || !form.branch) {
      setError('Please fill in Client Name, Service, Date, and Branch.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await updateAppointment(appointment.id, form);
      } else {
        await createAppointment({ ...form, price: Number(form.price), duration: Number(form.duration) });
      }
      onClose();
    } catch {
      setError('Failed to save appointment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const availableStaff = form.branch ? (STAFF_BY_BRANCH[form.branch] || []) : [];

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? '✏️ Edit Appointment' : '➕ New Appointment'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {error && (
              <div style={{
                background: 'var(--status-cancelled-bg)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', color: '#ef4444', fontSize: 13
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Client section */}
            <div className="form-section-title">Client Details</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Client Name *</label>
                <input className="form-input" name="clientName" value={form.clientName}
                  onChange={handleChange} placeholder="e.g. Priya Sharma" required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" name="phone" value={form.phone}
                  onChange={handleChange} placeholder="+91 98765 43210" />
              </div>
            </div>

            {/* Service section */}
            <div className="form-section-title">Service Details</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Service *</label>
                <select className="form-select" name="service" value={form.service} onChange={handleChange} required>
                  <option value="">Select service</option>
                  {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Branch *</label>
                <select className="form-select" name="branch" value={form.branch} onChange={handleChange} required>
                  <option value="">Select branch</option>
                  {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Stylist</label>
                <select className="form-select" name="stylist" value={form.stylist} onChange={handleChange}>
                  <option value="">Any available</option>
                  {availableStaff.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label">Price (₹)</label>
                  <input className="form-input" name="price" type="number" value={form.price}
                    onChange={handleChange} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Duration (min)</label>
                  <input className="form-input" name="duration" type="number" value={form.duration}
                    onChange={handleChange} placeholder="60" />
                </div>
              </div>
            </div>

            {/* Schedule section */}
            <div className="form-section-title">Schedule</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input className="form-input" name="date" type="date" value={form.date}
                  onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Time</label>
                <input className="form-input" name="time" type="time" value={form.time}
                  onChange={handleChange} />
              </div>
            </div>

            {isEdit && (
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" name="status" value={form.status} onChange={handleChange}>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" name="notes" value={form.notes}
                onChange={handleChange} placeholder="Any special instructions..." />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving} id="booking-modal-submit">
              {saving ? '⏳ Saving...' : isEdit ? '✅ Update Appointment' : '✅ Book Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
