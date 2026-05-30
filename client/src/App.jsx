// client/src/App.jsx
// Main app — Auth + routing + protected pages

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleRoute from './routes/RoleRoute';
import Layout from './components/Layout/Layout';
import ChatWidget from './components/AI/ChatWidget';
import BookingModal from './components/Appointments/BookingModal';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Appointments from './pages/Appointments';
import Clients from './pages/Clients';
import Staff from './pages/Staff';
import Branches from './pages/Branches';
import AIPage from './pages/AI';
import Analytics from './pages/Analytics';
import Inventory from './pages/Inventory';
import POS from './pages/POS';
import Calendar from './pages/Calendar';
import Customers from './pages/Customers';
import { useEffect, useState } from 'react';
import { useApp } from './context/AppContext';

function BookingModalController() {
  const { state, closeBooking, openBooking } = useApp();
  const [eventOpen, setEventOpen] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      // If the event carries AI prefill data, push it into AppContext too
      if (e.detail && Object.keys(e.detail).length > 0) {
        openBooking(e.detail);
      }
      setEventOpen(true);
    };
    window.addEventListener('open-booking', handler);
    return () => window.removeEventListener('open-booking', handler);
  }, [openBooking]);

  const isOpen = eventOpen || state.bookingModalOpen;
  if (!isOpen) return null;
  return <BookingModal onClose={() => { setEventOpen(false); closeBooking(); }} />;
}

function AppShell() {
  return (
    <Layout>
      <Routes>
        <Route path="/"            element={<Dashboard />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/clients"     element={<Clients />} />
        <Route path="/staff"       element={<Staff />} />
        <Route path="/branches"    element={<RoleRoute minRole="owner"><Branches /></RoleRoute>} />
        <Route path="/ai"          element={<AIPage />} />
        <Route path="/analytics"   element={<RoleRoute minRole="receptionist"><Analytics /></RoleRoute>} />
        <Route path="/inventory"   element={<RoleRoute minRole="receptionist"><Inventory /></RoleRoute>} />
        <Route path="/pos"         element={<RoleRoute minRole="receptionist"><POS /></RoleRoute>} />
        <Route path="/calendar"    element={<RoleRoute minRole="stylist"><Calendar /></RoleRoute>} />
        <Route path="/customers"   element={<RoleRoute minRole="receptionist"><Customers /></RoleRoute>} />
        <Route path="*"            element={<Navigate to="/" replace />} />
      </Routes>
      <BookingModalController />
      <ChatWidget />
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
