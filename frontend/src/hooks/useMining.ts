import { useState, useEffect, useCallback, useRef } from 'react';
import { MiningState } from '../types/index.js';
import { api } from '../services/api.js';

export function useMining(initialState?: MiningState | null) {
  const [mining, setMining] = useState<MiningState | null>(initialState || null);
  const [liveTon, setLiveTon] = useState<number>(initialState ? parseFloat(initialState.tonBalance) : 0);
  const [livePower, setLivePower] = useState<number>(initialState ? initialState.powerPercentage : 100);
  const [loading, setLoading] = useState<boolean>(!initialState);
  const [error, setError] = useState<string | null>(null);

  const lastSyncRef = useRef<number>(Date.now());
  const baseTonRef = useRef<number>(0);
  const hashrateRef = useRef<number>(0);
  const powerRef = useRef<number>(100);
  const capacityHoursRef = useRef<number>(8);

  const updateMiningState = useCallback((state: MiningState) => {
    setMining(state);
    const tonNum = parseFloat(state.tonBalance);
    baseTonRef.current = tonNum;
    hashrateRef.current = parseFloat(state.tonHashratePerSec);
    powerRef.current = state.powerPercentage;
    capacityHoursRef.current = state.powerCapacityHours || 8;
    lastSyncRef.current = Date.now();
    setLiveTon(tonNum);
    setLivePower(state.powerPercentage);
  }, []);

  const sync = useCallback(async () => {
    try {
      setError(null);
      const state = await api.syncMining();
      updateMiningState(state);
    } catch (err) {
      console.warn('Sync failed:', (err as Error).message);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [updateMiningState]);

  // Sync on mount
  useEffect(() => {
    sync();
    const interval = setInterval(sync, 45000); // Background server sync every 45s
    return () => clearInterval(interval);
  }, [sync]);

  // High-frequency client-side interpolation (runs every 200ms)
  useEffect(() => {
    const timer = setInterval(() => {
      if (!mining) return;

      const now = Date.now();
      const elapsedSec = (now - lastSyncRef.current) / 1000;
      const drainRatePerSec = 100 / (capacityHoursRef.current * 3600);

      const currentPowerCalc = Math.max(0, powerRef.current - elapsedSec * drainRatePerSec);
      setLivePower(Math.round(currentPowerCalc));

      if (currentPowerCalc > 0 && hashrateRef.current > 0) {
        // Battery is active, interpolate accrued TON
        const activeSec = Math.min(elapsedSec, powerRef.current / drainRatePerSec);
        const currentTonCalc = baseTonRef.current + activeSec * hashrateRef.current;
        setLiveTon(currentTonCalc);
      }
    }, 200);

    return () => clearInterval(timer);
  }, [mining]);

  const recharge = async (method: 'nc' | 'ad') => {
    setLoading(true);
    try {
      const res = await api.rechargePower(method);
      updateMiningState(res.mining);
      return res;
    } finally {
      setLoading(false);
    }
  };

  return {
    mining,
    liveTonBalance: liveTon.toFixed(6),
    livePowerPercentage: livePower,
    loading,
    error,
    sync,
    recharge,
    setMiningState: updateMiningState,
  };
}
