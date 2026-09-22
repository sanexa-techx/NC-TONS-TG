import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api.js';

export function useOnlinePlayers(userId?: string) {
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [peak24h, setPeak24h] = useState<number>(1);
  const [activeRealUsers, setActiveRealUsers] = useState<number>(1);
  const [isPulsing, setIsPulsing] = useState<boolean>(false);
  const prevCountRef = useRef<number>(1);

  const syncRealPresence = useCallback(async () => {
    try {
      const stats = await api.pingOnlineStatus(userId);
      if (stats && typeof stats.onlineCount === 'number') {
        if (stats.onlineCount !== prevCountRef.current) {
          setIsPulsing(true);
          setTimeout(() => setIsPulsing(false), 800);
          prevCountRef.current = stats.onlineCount;
        }
        setOnlineCount(stats.onlineCount);
        if (stats.peak24h) setPeak24h(stats.peak24h);
        if (stats.activeRealUsers !== undefined) setActiveRealUsers(stats.activeRealUsers);
      }
    } catch {
      // Fallback on network hiccups
    }
  }, [userId]);

  // Initial sync and regular 8-second presence ping
  useEffect(() => {
    syncRealPresence();
    const interval = setInterval(syncRealPresence, 8000);

    // Sync on tab focus / visibility return
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncRealPresence();
      }
    };
    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', syncRealPresence);

    // Signal disconnect on tab close / reload
    const handleUnload = () => {
      try {
        const payload = JSON.stringify({ userId, action: 'leave' });
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/stats/ping', new Blob([payload], { type: 'application/json' }));
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', syncRealPresence);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [syncRealPresence, userId]);

  return {
    onlineCount,
    peak24h,
    activeRealUsers,
    isPulsing,
  };
}
