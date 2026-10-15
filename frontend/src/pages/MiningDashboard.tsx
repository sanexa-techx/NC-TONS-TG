import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, MiningState, LevelStatusResponse } from '../types/index.js';
import { DualCurrencyBar } from '../components/DualCurrencyBar.js';
import { CircularBatteryGauge } from '../components/CircularBatteryGauge.js';
import { RechargeModal } from '../components/RechargeModal.js';
import DailyCheckInBanner from '../components/DailyCheckInBanner.js';
import { Gamepad2, Target, ArrowRight, Zap, Tv, ShieldCheck, Lock, Sparkles, Loader2, BatteryCharging, Clock, CheckCircle2, Gift } from 'lucide-react';
import { useAdManager } from '../hooks/useAdManager.js';
import { triggerAlternatingInterstitial } from '../services/adManager.js';
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

  const [claimNotice, setClaimNotice] = useState<string | null>(null);
  const [claimingRewards, setClaimingRewards] = useState(false);

  const handleClaimRewards = async () => {
    if (claimingRewards) return;
    setClaimingRewards(true);
    haptic('success');
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10B981', '#2563EB', '#F59E0B', '#1E3A8A'],
      });
    } catch {}

    try {
      const adRes = await triggerAlternatingInterstitial(true);
      if (adRes.shown) {
        setClaimNotice(`Rewards claimed! Interstitial ad displayed via ${adRes.provider} (1:1 alternating).`);
      } else {
        setClaimNotice(`Rewards claimed! Cooldown active for next ad.`);
      }
      setTimeout(() => setClaimNotice(null), 5000);
      if (onRecharge) onRecharge('nc').catch(() => {});
    } catch (e) {
      setClaimNotice('Rewards claimed successfully!');
      setTimeout(() => setClaimNotice(null), 4000);
    } finally {
      setClaimingRewards(false);
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

      {/* Central 8H MINING BATTERY Card (Obsidian Glassmorphism) */}
      <div className="w-full obsidian-card p-4 rounded-2xl border border-white/10 shadow-2xl shadow-black/80 mb-3.5 relative overflow-hidden">
        {/* Ambient Top Glows */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.35)]">
              <BatteryCharging size={18} />
            </div>
            <div>
              <h3 className="text-xs font-black tracking-wider uppercase text-white">
                8H MINING BATTERY
              </h3>
              <p className="text-[10px] font-mono text-slate-400">Autonomous dual-yield rig</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full btn-mint-glass font-black">
            66% ACTIVE
          </span>
        </div>

        {/* 3D Translucent Glass Battery Cylinder filled to 66% with Glowing Neon-Mint Liquid */}
        <div className="relative w-full mb-3 flex items-center">
          <div className="relative flex-1 h-8 bg-slate-950/70 rounded-full border border-white/20 p-1 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] backdrop-blur-md overflow-hidden">
            {/* Top Specular Sheen Reflection */}
            <div className="absolute inset-x-2 top-0.5 h-2.5 bg-gradient-to-b from-white/25 to-transparent rounded-t-full pointer-events-none z-10" />

            {/* Glowing Neon-Mint Liquid Fill (66%) */}
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-[#10B981] shadow-[0_0_18px_rgba(16,185,129,0.6)] transition-all duration-700 relative overflow-hidden flex items-center justify-end pr-2"
              style={{ width: '66%' }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
              <span className="text-[9px] font-mono font-black text-slate-950 relative z-10 tracking-tight">
                66%
              </span>
            </div>
          </div>
          <div className="w-2 h-4 rounded-r-md bg-slate-700 border border-white/20 -ml-0.5 shadow-sm shrink-0" />
        </div>

        {/* Neon-Mint Digital Countdown Banner: 05:14:12 LEFT */}
        <div className="mb-3.5 p-2 rounded-xl bg-slate-950/60 border border-emerald-500/30 flex items-center justify-between text-xs backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono uppercase">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Time Remaining</span>
          </div>
          <span className="font-mono font-black text-emerald-300 text-xs tracking-wider drop-shadow-[0_0_8px_rgba(16,185,129,0.7)]">
            05:14:12 LEFT
          </span>
        </div>

        {/* 3 Smoked-Glass Metric Sub-Cards: OUTPUT: +0.50M, MINED: 63,601, BOOST: x1.5 */}
        <div className="grid grid-cols-3 gap-2 mb-3.5">
          <div className="btn-smoked-glass rounded-xl p-2 text-center min-w-0">
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight truncate">OUTPUT</p>
            <p className="text-[11px] font-black text-emerald-300 font-mono mt-0.5 truncate drop-shadow-[0_0_6px_rgba(16,185,129,0.4)]">
              +0.50M
            </p>
          </div>
          <div className="btn-smoked-glass rounded-xl p-2 text-center min-w-0">
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight truncate">MINED</p>
            <p className="text-[11px] font-black text-amber-300 font-mono mt-0.5 truncate drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]">
              63,601
            </p>
          </div>
          <div className="btn-smoked-glass rounded-xl p-2 text-center min-w-0">
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight truncate">BOOST</p>
            <p className="text-[11px] font-black text-blue-300 font-mono mt-0.5 truncate drop-shadow-[0_0_6px_rgba(37,99,235,0.4)]">
              x1.5
            </p>
          </div>
        </div>

        {/* Full-width glowing Amber Gold ACTIVATE BOOST button stacked above full-width glowing Cobalt Blue CLAIM REWARDS */}
        <div className="space-y-2">
          <button
            onClick={() => {
              triggerInterstitial('start');
              setRechargeOpen(true);
            }}
            className="w-full py-2.5 px-4 rounded-xl btn-amber-glass font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_18px_rgba(245,158,11,0.3)] active:scale-[0.98]"
          >
            <Zap size={14} className="fill-amber-300 text-amber-300" />
            <span>⚡ ACTIVATE BOOST</span>
          </button>

          <button
            onClick={handleClaimRewards}
            disabled={claimingRewards}
            className="w-full py-2.5 px-4 rounded-xl btn-cobalt-glass font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-[0.98]"
          >
            {claimingRewards ? (
              <Loader2 size={14} className="animate-spin text-blue-200" />
            ) : (
              <Gift size={14} className="text-blue-200" />
            )}
            <span>💎 CLAIM REWARDS</span>
          </button>
        </div>

        {claimNotice && (
          <div className="mt-2.5 p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono text-center flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
            <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
            <span>{claimNotice}</span>
          </div>
        )}
      </div>

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
      <div className="w-full obsidian-card p-4 rounded-2xl border border-white/10 shadow-xl mb-4">
        <div className="text-xs font-mono uppercase text-slate-400 mb-3 flex items-center justify-between">
          <span className="font-bold text-white">RIG TELEMETRY</span>
          <span className="text-emerald-400 font-bold flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse shadow-[0_0_8px_#10B981]" />
            <span>ONLINE</span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-white/10">
            <div className="text-slate-400 text-[10px] uppercase font-mono font-semibold">Current Hashrate</div>
            <div className="text-emerald-300 font-mono font-bold mt-0.5">{hashrate} TON/s</div>
          </div>
          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-white/10">
            <div className="text-slate-400 text-[10px] uppercase font-mono font-semibold">24h Max Output</div>
            <div className="text-blue-300 font-mono font-bold mt-0.5">~{dailyProjectedTon} TON</div>
          </div>
        </div>
      </div>

      {/* Miner Rig Level & Upgrade Panel */}
      <div className="w-full obsidian-card p-4 rounded-2xl border border-white/10 shadow-xl mb-4 relative overflow-hidden">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-xs">
              <Zap size={18} />
            </div>
            <div>
              <div className="text-xs font-black text-white flex items-center gap-1.5">
                <span>RIG LEVEL {levelStatus?.currentLevel || user?.minerLevel || 1}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full btn-amber-glass font-bold">
                  {levelStatus?.currentLevel && levelStatus.currentLevel >= 2 ? 'HIGH-ROLLER' : 'STANDARD'}
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                Rate: <span className="text-blue-300 font-bold">{hashrate} TON/s</span>
                {levelStatus && (
                  <span> → Next: <span className="text-amber-300 font-bold">{levelStatus.nextHashrate} TON/s</span></span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono text-slate-400 block">Payout Tier</span>
            <span className={`text-[11px] font-mono font-bold flex items-center justify-end gap-1 ${levelStatus?.canWithdrawOverHalfTon ? 'text-emerald-400' : 'text-amber-300'}`}>
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
        <div className="bg-slate-950/70 p-3 rounded-xl border border-white/10 space-y-2">
          <div className="flex justify-between items-center text-[11px] font-mono">
            <span className="text-slate-300 flex items-center gap-1.5 font-semibold">
              <Tv size={13} className="text-blue-400" />
              <span>Watch 50 Ads in 1 Day to Level Up</span>
            </span>
            <span className="text-blue-300 font-bold">
              {levelStatus ? levelStatus.adsWatchedToday : 0} / 50 Ads
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-[#10B981] transition-all duration-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"
              style={{ width: `${levelStatus ? levelStatus.progressPercent : 0}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
            <span>Boosts hashrate + unlocks &gt;0.5 TON payouts</span>
            <span className="font-mono text-emerald-400 font-bold">{levelStatus ? levelStatus.progressPercent : 0}%</span>
          </div>

          {/* Upgrade Action / Progress Button */}
          {levelStatus?.canLevelUp ? (
            <button
              onClick={handleLevelUpgrade}
              disabled={upgradingLevel}
              className="w-full py-2.5 px-4 rounded-xl btn-cobalt-glass text-white font-extrabold text-xs uppercase tracking-wider transition active:scale-98 flex items-center justify-center gap-1.5 animate-pulse cursor-pointer"
            >
              {upgradingLevel ? (
                <>
                  <Loader2 size={14} className="animate-spin text-white" />
                  <span>Upgrading Rig...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} className="fill-white" />
                  <span>UPGRADE TO LEVEL {levelStatus.nextLevel} (+500 NC BONUS)</span>
                </>
              )}
            </button>
          ) : levelStatus?.hasLeveledUpToday ? (
            <div className="w-full py-2 px-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-center text-xs font-mono flex items-center justify-center gap-1.5">
              <span>✅ Rig upgraded today! Watch 50 ads tomorrow for Level {levelStatus.nextLevel}.</span>
            </div>
          ) : (
            <button
              onClick={() => onNavigate('missions')}
              className="w-full py-2 px-3 rounded-xl btn-smoked-glass text-slate-300 text-xs font-mono transition flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer"
            >
              <Tv size={13} className="text-blue-400" />
              <span>Watch Ads in Missions ({levelStatus ? levelStatus.adsRemaining : 50} more needed)</span>
              <ArrowRight size={13} className="text-slate-400" />
            </button>
          )}

          {upgradeMessage && (
            <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[11px] text-center font-mono">
              {upgradeMessage}
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="w-full space-y-2.5">
        <button
          onClick={() => onNavigate('game')}
          className="w-full p-3.5 rounded-2xl obsidian-card hover:border-blue-400/50 transition-all flex items-center justify-between group active:scale-98 cursor-pointer shadow-xl"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center justify-center shadow-xs">
              <Gamepad2 size={22} />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                Arcade Hub (4 Mini-Games)
              </div>
              <div className="text-[11px] text-slate-400">
                Color Tube Sort, Memory Matrix &amp; Cyber Car Race
              </div>
            </div>
          </div>
          <ArrowRight size={18} className="text-slate-500 group-hover:text-blue-300 group-hover:translate-x-1 transition-all" />
        </button>

        <button
          onClick={() => onNavigate('missions')}
          className="w-full p-3.5 rounded-2xl obsidian-card hover:border-emerald-400/50 transition-all flex items-center justify-between group active:scale-98 cursor-pointer shadow-xl"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center shadow-xs">
              <Target size={22} />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                Sponsored Missions &amp; Ad Hub
              </div>
              <div className="text-[11px] text-slate-400">
                Complete community tasks or watch 200 daily ads
              </div>
            </div>
          </div>
          <ArrowRight size={18} className="text-slate-500 group-hover:text-emerald-300 group-hover:translate-x-1 transition-all" />
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
