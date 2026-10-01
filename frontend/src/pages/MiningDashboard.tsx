import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, MiningState, LevelStatusResponse } from '../types/index.js';
import { DualCurrencyBar } from '../components/DualCurrencyBar.js';
import { CircularBatteryGauge } from '../components/CircularBatteryGauge.js';
import { RechargeModal } from '../components/RechargeModal.js';
import DailyCheckInBanner from '../components/DailyCheckInBanner.js';
import { Gamepad2, Target, ArrowRight, Zap, Tv, ShieldCheck, Lock, Sparkles, Loader2 } from 'lucide-react';
import { useAdManager } from '../hooks/useAdManager.js';
import { useTelegram } from '../hooks/useTelegram.js';
import { api } from '../services/api.js';
import confetti from 'canvas-confetti';

interface MiningDashboardProps {
  user: UserProfile | null;
  mining: MiningState | null;
  liveTonBalance: string;
  livePowerPercentage: number;
  dailyStreak?: number;
  canClaimDaily?: boolean;
  onOpenDailyModal?: () => void;
  onRecharge: (method: 'nc' | 'ad') => Promise<any>;
  onNavigate: (tab: 'mining' | 'game' | 'missions' | 'wallet' | 'admin') => void;
}

export const MiningDashboard: React.FC<MiningDashboardProps> = ({
  user,
  mining,
  liveTonBalance,
  livePowerPercentage,
  dailyStreak = 0,
  canClaimDaily = false,
  onOpenDailyModal,
  onRecharge,
  onNavigate,
}) => {
  const { haptic } = useTelegram();
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [levelStatus, setLevelStatus] = useState<LevelStatusResponse | null>(null);
  const [upgradingLevel, setUpgradingLevel] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState<string | null>(null);

  const { triggerInterstitial } = useAdManager(user?.id || '');

  const rawHashrate = mining ? mining.tonHashratePerSec : '0.00000020';
  const hashrate = Number(rawHashrate).toFixed(8);
  const capacityHours = mining ? mining.powerCapacityHours : 8;

  // Daily projected TON calculation (if 100% powered)
  const dailyProjectedTon = (parseFloat(hashrate) * 86400).toFixed(4);

  const fetchLevelStatus = useCallback(async () => {
    try {
      const data = await api.getLevelStatus(user?.id);
      setLevelStatus(data);
    } catch (err) {
      console.warn('Failed to fetch level status:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchLevelStatus();
  }, [fetchLevelStatus]);

  const handleLevelUpgrade = async () => {
    if (upgradingLevel || !levelStatus?.canLevelUp) return;
    setUpgradingLevel(true);
    setUpgradeMessage(null);
    haptic('medium');

    try {
      const res = await api.upgradeLevel(user?.id);
      setUpgradeMessage(res.message);
      haptic('success');
      try {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#0098EA', '#F59E0B', '#10B981', '#6366F1'],
        });
      } catch {}
      fetchLevelStatus();
      if (onRecharge) onRecharge('nc').catch(() => {});
    } catch (err: any) {
      setUpgradeMessage(err.message || 'Level upgrade failed');
      haptic('error');
    } finally {
      setUpgradingLevel(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto px-4 pb-24 pt-2">
      {/* Dual Currency Bar */}
      <DualCurrencyBar
        tonBalance={liveTonBalance}
        ncBalance={mining?.ncBalance || 0}
        isMiningActive={livePowerPercentage > 0}
      />

      {/* Daily Streak Check-In Launcher Banner */}
      {onOpenDailyModal && (
        <div className="w-full mb-3 flex justify-center">
          <DailyCheckInBanner
            streak={dailyStreak}
            canClaim={canClaimDaily}
            onClick={onOpenDailyModal}
          />
        </div>
      )}

      {/* Circular Battery & Mining Gauge */}
      <CircularBatteryGauge
        powerPercentage={livePowerPercentage}
        powerCapacityHours={capacityHours}
        hashratePerSec={hashrate}
        onRechargeClick={() => {
          triggerInterstitial('start');
          setRechargeOpen(true);
        }}
      />

      {/* Mining Rig Stats Panel */}
      <div className="w-full glass-panel p-4 rounded-2xl border border-cyber-border mb-4">
        <div className="text-xs font-mono uppercase text-slate-400 mb-3 flex items-center justify-between">
          <span>RIG TELEMETRY</span>
          <span className="text-cyber-green font-bold flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyber-green inline-block animate-pulse" />
            <span>ONLINE</span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-cyber-bg/60 p-2.5 rounded-xl border border-cyber-border/50">
            <div className="text-slate-400 text-[10px] uppercase font-mono">Current Hashrate</div>
            <div className="text-white font-mono font-bold mt-0.5">{hashrate} TON/s</div>
          </div>
          <div className="bg-cyber-bg/60 p-2.5 rounded-xl border border-cyber-border/50">
            <div className="text-slate-400 text-[10px] uppercase font-mono">24h Max Output</div>
            <div className="text-cyber-cyan font-mono font-bold mt-0.5">~{dailyProjectedTon} TON</div>
          </div>
        </div>
      </div>

      {/* Miner Rig Level & Upgrade Panel */}
      <div className="w-full glass-panel p-4 rounded-2xl border border-cyber-border mb-4 relative overflow-hidden">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-glow-gold/30">
              <Zap size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>RIG LEVEL {levelStatus?.currentLevel || user?.minerLevel || 1}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  {levelStatus?.currentLevel && levelStatus.currentLevel >= 2 ? 'HIGH-ROLLER' : 'STANDARD'}
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                Rate: <span className="text-cyber-cyan font-bold">{hashrate} TON/s</span>
                {levelStatus && (
                  <span> → Next: <span className="text-amber-300 font-bold">{levelStatus.nextHashrate} TON/s</span></span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono text-slate-400 block">Payout Tier</span>
            <span className={`text-[11px] font-mono font-bold flex items-center justify-end gap-1 ${levelStatus?.canWithdrawOverHalfTon ? 'text-emerald-400' : 'text-amber-400'}`}>
              {levelStatus?.canWithdrawOverHalfTon ? (
                <>
                  <ShieldCheck size={12} />
                  <span>&gt;0.5 TON OK</span>
                </>
              ) : (
                <>
                  <Lock size={12} />
                  <span>Max 0.5 TON</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Daily 50 Ads Level-Up Progress */}
        <div className="bg-cyber-bg/70 p-3 rounded-xl border border-cyber-border/60 space-y-2">
          <div className="flex justify-between items-center text-[11px] font-mono">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Tv size={13} className="text-amber-400" />
              <span>Watch 50 Ads in 1 Day to Level Up</span>
            </span>
            <span className="text-amber-400 font-bold">
              {levelStatus ? levelStatus.adsWatchedToday : 0} / 50 Ads
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden border border-neutral-700/50">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 transition-all duration-500 rounded-full"
              style={{ width: `${levelStatus ? levelStatus.progressPercent : 0}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
            <span>Boosts hashrate + unlocks &gt;0.5 TON payouts</span>
            <span className="font-mono text-amber-300 font-bold">{levelStatus ? levelStatus.progressPercent : 0}%</span>
          </div>

          {/* Upgrade Action / Progress Button */}
          {levelStatus?.canLevelUp ? (
            <button
              onClick={handleLevelUpgrade}
              disabled={upgradingLevel}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 transition active:scale-98 flex items-center justify-center gap-1.5 animate-pulse"
            >
              {upgradingLevel ? (
                <>
                  <Loader2 size={14} className="animate-spin text-black" />
                  <span>Upgrading Rig...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} className="fill-black" />
                  <span>UPGRADE TO LEVEL {levelStatus.nextLevel} (+500 NC BONUS)</span>
                </>
              )}
            </button>
          ) : levelStatus?.hasLeveledUpToday ? (
            <div className="w-full py-2 px-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-center text-xs font-mono flex items-center justify-center gap-1.5">
              <span>✅ Rig upgraded today! Watch 50 ads tomorrow for Level {levelStatus.nextLevel}.</span>
            </div>
          ) : (
            <button
              onClick={() => onNavigate('missions')}
              className="w-full py-2 px-3 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/70 text-slate-300 hover:text-white text-xs font-mono transition flex items-center justify-center gap-1.5 active:scale-98"
            >
              <Tv size={13} className="text-amber-400" />
              <span>Watch Ads in Missions ({levelStatus ? levelStatus.adsRemaining : 50} more needed today)</span>
              <ArrowRight size={13} className="text-slate-400" />
            </button>
          )}

          {upgradeMessage && (
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] text-center font-mono">
              {upgradeMessage}
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="w-full space-y-2.5">
        {/* Arcade Hub Banner */}
        <button
          onClick={() => onNavigate('game')}
          className="w-full p-3.5 rounded-2xl glass-panel border border-cyber-border hover:border-cyber-cyan/50 transition-all flex items-center justify-between group active:scale-98"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyber-cyan/20 flex items-center justify-center text-cyber-cyan shadow-glow-cyan/30">
              <Gamepad2 size={22} />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-white group-hover:text-cyber-cyan transition-colors">
                Arcade Hub (3 Mini-Games)
              </div>
              <div className="text-[11px] text-slate-400">
                Memory Matrix, 2048 & Cyber Car Race for instant bounties
              </div>
            </div>
          </div>
          <ArrowRight size={18} className="text-slate-400 group-hover:text-cyber-cyan group-hover:translate-x-1 transition-all" />
        </button>

        {/* Missions Banner */}
        <button
          onClick={() => onNavigate('missions')}
          className="w-full p-3.5 rounded-2xl glass-panel border border-cyber-border hover:border-cyber-gold/50 transition-all flex items-center justify-between group active:scale-98"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyber-gold/20 flex items-center justify-center text-cyber-gold shadow-glow-gold/30">
              <Target size={22} />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-white group-hover:text-cyber-gold transition-colors">
                Sponsored Missions Center
              </div>
              <div className="text-[11px] text-slate-400">
                Complete community tasks or promote your channel
              </div>
            </div>
          </div>
          <ArrowRight size={18} className="text-slate-400 group-hover:text-cyber-gold group-hover:translate-x-1 transition-all" />
        </button>
      </div>

      {/* Recharge Modal */}
      <RechargeModal
        isOpen={rechargeOpen}
        onClose={() => setRechargeOpen(false)}
        ncBalance={mining?.ncBalance || 0}
        onRecharge={onRecharge}
      />
    </div>
  );
};
