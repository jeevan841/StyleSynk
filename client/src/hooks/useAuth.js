// client/src/hooks/useAuth.js
// Convenience re-export so components can import from hooks/useAuth
// instead of going directly to context

export { useAuth } from '../context/AuthContext';
export default function useAuth() {
  const { useAuth: _useAuth } = require('../context/AuthContext');
  return _useAuth();
}
