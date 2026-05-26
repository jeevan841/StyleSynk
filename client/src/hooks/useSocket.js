// client/src/hooks/useSocket.js
// Socket.IO hook — connects on mount, joins branch room, exposes event listener

import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socketInstance = null;

export function useSocket() {
  const { user, isAuthenticated } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Singleton socket — don't reconnect if already connected
    if (!socketInstance || !socketInstance.connected) {
      socketInstance = io(SOCKET_URL, {
        transports: ['websocket'],
        autoConnect: true,
      });
    }
    socketRef.current = socketInstance;

    socketInstance.on('connect', () => {
      console.log('🔌 Socket connected:', socketInstance.id);
      // Join branch room
      if (user?.branch_id) {
        socketInstance.emit('join:branch', user.branch_id);
      }
      // Join user room for personal notifications
      if (user?.id) {
        socketInstance.emit('join:user', user.id);
      }
    });

    return () => {
      // Don't disconnect — keep singleton alive for the session
    };
  }, [isAuthenticated, user]);

  const on = useCallback((event, handler) => {
    const socket = socketRef.current || socketInstance;
    if (!socket) return () => {};
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, []);

  const emit = useCallback((event, data) => {
    const socket = socketRef.current || socketInstance;
    if (socket) socket.emit(event, data);
  }, []);

  return { on, emit, socket: socketRef.current };
}
