// client/src/hooks/useAppointments.js
// Reactive appointments hook — fetches, filters, and subscribes to Socket.IO updates

import { useState, useEffect, useCallback, useRef, startTransition } from 'react';
import { appointmentsAPI } from '../api';
import { useSocket } from './useSocket';

/**
 * useAppointments — manages appointments state for a branch/date
 *
 * @param {object} filters — { branch_id, date, staff_id, status }
 * @returns {{ appointments, loading, error, refresh, addLocal, updateLocal, cancelLocal }}
 */
export function useAppointments(filters = {}) {
  const [appointments, setAppointments] = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const filtersRef = useRef(filters);
  const { on } = useSocket();

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await appointmentsAPI.getAll(filtersRef.current);
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    filtersRef.current = filters;
    startTransition(() => fetch());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  // Socket.IO reactive updates
  useEffect(() => {
    const unsubCreated   = on('appointment:created', (appt) => {
      setAppointments(prev => {
        // Don't add if already exists (idempotent)
        if (prev.find(a => a.id === appt.id)) return prev;
        return [appt, ...prev].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
      });
    });

    const unsubUpdated   = on('appointment:updated', (appt) => {
      setAppointments(prev => prev.map(a => a.id === appt.id ? appt : a));
    });

    const unsubCancelled = on('appointment:cancelled', ({ id }) => {
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a));
    });

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubCancelled();
    };
  }, [on]);

  // Local optimistic helpers
  const addLocal    = useCallback((appt) => {
    setAppointments(prev => [appt, ...prev].sort((a, b) => new Date(a.start_time) - new Date(b.start_time)));
  }, []);

  const updateLocal = useCallback((appt) => {
    setAppointments(prev => prev.map(a => a.id === appt.id ? appt : a));
  }, []);

  const cancelLocal = useCallback((id) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a));
  }, []);

  return {
    appointments,
    loading,
    error,
    refresh:      fetch,
    addLocal,
    updateLocal,
    cancelLocal,
  };
}

export default useAppointments;
