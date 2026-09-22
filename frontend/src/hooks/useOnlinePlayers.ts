import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api.js';

export function useOnlinePlayers(userId?: string) {
  const [onlineCount, setOnlineCount] = useState<number>(1380);
  const [peak24h, setPeak24h] = useState<number>(3840);
  const [activeRealUsers, setActiveRealUsers] = useState<number>(1);
  const [isPulsing, setIsPulsing] = useState<boolean>(false);
  const prevCountRef = useRef<number>(1380);

  const syncStats = useCallback(async () => {
    try {
      const stats = userId ? await api.pingOnlineStatus(userId) : await api.getOnlineStats();
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
      // Fallback gracefully on temporary network blips
    }
  }, [userId]);

  // Initial fetch and regular 10s background sync
  useEffect(() => {
    syncStats();
    const interval = setInterval(syncStats, 10000);
    return () => clearInterval(interval);
  }, [syncStats]);

  // Micro-organic fluctuation every 3.5s for real-time heartbeat feeling
  useEffect(() => {
    const microTimer = setInterval(() => {
      // 40% chance of small +-1 or +-2 micro-tick
      if (Math.random() < 0.45) {
        const delta = Math.random() > 0.5 ? 1 : -1;
        setOnlineCount((prev) => {
          const next = Math.max(10, prev + delta);
          if (next !== prev) {
            setIsPulsing(true);
            setTimeout(() => setIsPulsing(false), 600);
            prevCountRef.current = next;
          }
          return next;
        });
      }
    }, 3500);

    return () => clearInterval(microTimer);
  }, []);

  return {
    onlineCount,
    peak24h,
    activeRealUsers,
    isPulsing,
  };
}
