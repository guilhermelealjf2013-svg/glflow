import { useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';

const AWAY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export function useActivityMonitor() {
  const { emitStatus } = useSocket();
  const timerRef = useRef(null);
  const currentStatusRef = useRef('ONLINE');

  const setStatus = useCallback((status) => {
    if (currentStatusRef.current === status) return;
    currentStatusRef.current = status;
    emitStatus(status);
  }, [emitStatus]);

  const resetTimer = useCallback(() => {
    if (currentStatusRef.current !== 'ONLINE') {
      setStatus('ONLINE');
    }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setStatus('AWAY');
    }, AWAY_TIMEOUT_MS);
  }, [setStatus]);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));

    // Start timer on mount
    resetTimer();

    function handleBeforeUnload() {
      // Use sendBeacon for reliability on page close
      const token = localStorage.getItem('glflow_token');
      if (token) {
        // Socket disconnect will handle OFFLINE via server-side disconnect event
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearTimeout(timerRef.current);
      events.forEach(e => window.removeEventListener(e, resetTimer));
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [resetTimer]);
}
