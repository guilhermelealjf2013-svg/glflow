import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user, getToken } = useAuth();
  const socketRef = useRef(null);
  const [presence, setPresence] = useState({});
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      return;
    }

    const socket = io(import.meta.env.VITE_API_URL || '/', {
      auth: { token: getToken() },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('presence:snapshot', (snapshot) => {
      setPresence(snapshot);
    });

    socket.on('presence:update', ({ userId, status }) => {
      setPresence(prev => ({ ...prev, [userId]: { status, lastSeen: new Date() } }));
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  function emitStatus(status) {
    socketRef.current?.emit('presence:status', status);
  }

  function emitTaskChanged(payload) {
    socketRef.current?.emit('task:status-changed', payload);
  }

  function onTaskChanged(cb) {
    socketRef.current?.on('task:status-changed', cb);
    return () => socketRef.current?.off('task:status-changed', cb);
  }

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, presence, connected, emitStatus, emitTaskChanged, onTaskChanged }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
