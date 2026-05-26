import { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { appointmentsAPI, branchesAPI, staffAPI, customersAPI, servicesAPI } from '../api';

const AppContext = createContext(null);

const initialState = {
  appointments: [],
  branches: [],
  staff: [],
  clients: [],
  services: [],
  loading: { appointments: false, branches: false, staff: false, clients: false },
  activeBranch: 'all',
  bookingModalOpen: false,
  prefillData: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD': return { ...state, [action.key]: action.value };
    case 'SET_LOADING': return { ...state, loading: { ...state.loading, [action.key]: action.value } };
    case 'ADD_APPOINTMENT': return { ...state, appointments: [...state.appointments, action.payload] };
    case 'UPDATE_APPOINTMENT':
      return { ...state, appointments: state.appointments.map(a => a.id === action.payload.id ? action.payload : a) };
    case 'DELETE_APPOINTMENT':
      return { ...state, appointments: state.appointments.filter(a => a.id !== action.id) };
    case 'OPEN_BOOKING': return { ...state, bookingModalOpen: true, prefillData: action.prefill || null };
    case 'CLOSE_BOOKING': return { ...state, bookingModalOpen: false, prefillData: null };
    default: return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { isAuthenticated } = useAuth();

  const fetchData = async (key, fn) => {
    dispatch({ type: 'SET_LOADING', key, value: true });
    try {
      const data = await fn();
      dispatch({ type: 'SET_FIELD', key, value: data });
    } catch (e) {
      console.error(`Failed to load ${key}:`, e.message);
    } finally {
      dispatch({ type: 'SET_LOADING', key, value: false });
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchData('appointments', appointmentsAPI.getAll);
    fetchData('branches', branchesAPI.getAll);
    fetchData('staff', staffAPI.getAll);
    fetchData('clients', customersAPI.getAll);
    fetchData('services', servicesAPI.getAll);
  }, [isAuthenticated]);


  const actions = {
    refreshAppointments: () => fetchData('appointments', appointmentsAPI.getAll),
    createAppointment: async (data) => {
      const appt = await appointmentsAPI.create(data);
      dispatch({ type: 'ADD_APPOINTMENT', payload: appt });
      return appt;
    },
    updateAppointment: async (id, data) => {
      const appt = await appointmentsAPI.update(id, data);
      dispatch({ type: 'UPDATE_APPOINTMENT', payload: appt });
      return appt;
    },
    deleteAppointment: async (id) => {
      await appointmentsAPI.remove(id);
      dispatch({ type: 'DELETE_APPOINTMENT', id });
    },
    setActiveBranch: (branch) => dispatch({ type: 'SET_FIELD', key: 'activeBranch', value: branch }),
    openBooking: (prefill) => dispatch({ type: 'OPEN_BOOKING', prefill }),
    closeBooking: () => dispatch({ type: 'CLOSE_BOOKING' }),
  };

  return <AppContext.Provider value={{ state, dispatch, ...actions }}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- context modules conventionally export both Provider and hook
export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
};
// auth guard active
