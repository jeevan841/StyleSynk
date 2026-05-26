// client/src/pages/Login.jsx
// Premium login page with glassmorphism design

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEMO_ACCOUNTS = [
  { role: 'Owner', email: 'owner@stylesynk.com', password: 'Password123!', color: '#a78bfa' },
  { role: 'Branch Manager', email: 'manager.banjara@stylesynk.com', password: 'Password123!', color: '#34d399' },
  { role: 'Receptionist', email: 'recep.banjara@stylesynk.com', password: 'Password123!', color: '#60a5fa' },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (acc) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setError('');
  };

  return (
    <div className="login-page">
      {/* Animated background orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="logo-icon">✂️</div>
          <h1 className="logo-title">StyleSynk</h1>
          <p className="logo-subtitle">AI-Powered Salon Management</p>
        </div>

        {/* Demo accounts */}
        <div className="demo-accounts">
          <p className="demo-label">Quick Demo Login</p>
          <div className="demo-grid">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.role}
                onClick={() => fillDemo(acc)}
                className="demo-btn"
                style={{ '--accent': acc.color }}
                type="button"
              >
                {acc.role}
              </button>
            ))}
          </div>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="owner@stylesynk.com"
              required
              autoComplete="email"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="form-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="login-btn"
          >
            {loading ? (
              <span className="login-spinner" />
            ) : (
              '→ Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
