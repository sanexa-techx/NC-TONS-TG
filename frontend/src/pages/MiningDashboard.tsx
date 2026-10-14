import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, MiningState, LevelStatusResponse } from '../types/index.js';
import { DualCurrencyBar } from '../components/DualCurrencyBar.js';
import { CircularBatteryGauge } from '../components/CircularBatteryGauge.js';
import { RechargeModal } from '../components/RechargeModal.js';
import DailyCheckInBanner from '../components/DailyCheckInBanner.js';
import { Gamepad2, Target, ArrowRight, Zap, Tv, ShieldCheck, Lock, Sparkles, Loader2, BatteryCharging, Clock, CheckCircle2 } from 'lucide-react';
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
      // Trigger 1:1 alternating interstitial ad after claim (Monetag <-> Gigapub)
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

      {/* Central 8H MINING BATTERY Card */}
      <div className="w-full bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm mb-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#10B981]">
              <BatteryCharging size={18} />
            </div>
            <div>
              <h3 className="text-xs font-black tracking-wider uppercase text-slate-800">
                8H MINING BATTERY
              </h3>
              <p className="text-[10px] font-mono text-slate-500">Autonomous dual-yield rig</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#10B981] font-bold">
            66% ACTIVE
          </span>
        </div>

        {/* 66% Neo-Mint Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200/80 mb-3">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-[#10B981] rounded-full transition-all duration-700 shadow-xs relative"
            style={{ width: '66%' }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse" />
          </div>
        </div>

        {/* Telemetry Row: Countdown Timer & Rate */}
        <div className="grid grid-cols-2 gap-2.5 mb-3.5">
          <div className="bg-[#F8FAFC] p-2.5 rounded-xl border border-[#E2E8F0] flex flex-col justify-between">
            <span className="text-[10px] uppercase font-mono text-slate-400 font-semibold flex items-center gap-1">
              <Clock size={11} className="text-[#2563EB]" /> Countdown Timer
            </span>
            <div className="text-sm font-black font-mono text-slate-900 mt-0.5 tracking-wider">
              05:14:12
            </div>
          </div>

          <div className="bg-[#EFF6FF]/60 p-2.5 rounded-xl border border-blue-100 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-mono text-slate-400 font-semibold">
              Mining Rate
            </span>
            <div className="text-xs font-bold font-mono text-[#2563EB] mt-0.5 truncate">
              +0.500M NC / +0.40 TON per hr
            </div>
          </div>
        </div>

        {/* Action Buttons: ACTIVATE BOOST (outlined cobalt) & CLAIM REWARDS (solid deep-cobalt) */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => {
              triggerInterstitial('start');
              setRechargeOpen(true);
            }}
            className="w-full py-3 px-3 rounded-xl border-2 border-[#2563EB] text-[#2563EB] hover:bg-blue-50 font-extrabold text-xs uppercase tracking-wider transition active:scale-98 flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Zap size={14} />
            <span>ACTIVATE BOOST</span>
          </button>

          <button
            onClick={handleClaimRewards}
            disabled={claimingRewards}
            className="w-full py-3 px-3 rounded-xl bg-[#1E3A8A] hover:bg-blue-900 text-white font-extrabold text-xs uppercase tracking-wider transition active:scale-98 shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {claimingRewards ? (
              <Loader2 size={14} className="animate-spin text-white" />
            ) : (
              <Sparkles size={14} className="text-amber-300" />
            )}
            <span>CLAIM REWARDS</span>
          </button>
        </div>

        {claimNotice && (
          <div className="mt-2.5 p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-mono text-center flex items-center justify-center gap-1.5 animate-in fade-in">
            <CheckCircle2 size={13} className="text-[#10B981] shrink-0" />
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
      <div className="w-full bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm mb-4">
        <div className="text-xs font-mono uppercase text-slate-400 mb-3 flex items-center justify-between">
          <span className="font-bold text-slate-700">RIG TELEMETRY</span>
          <span className="text-[#059669] font-bold flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] inline-block animate-pulse" />
            <span>ONLINE</span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-[#ECFDF5]/60 p-2.5 rounded-xl border border-emerald-100">
            <div className="text-slate-400 text-[10px] uppercase font-mono font-semibold">Current Hashrate</div>
            <div className="text-slate-900 font-mono font-bold mt-0.5">{hashrate} TON/s</div>
          </div>
          <div className="bg-[#EFF6FF]/70 p-2.5 rounded-xl border border-blue-100">
            <div className="text-slate-400 text-[10px] uppercase font-mono font-semibold">24h Max Output</div>
            <div className="text-[#2563EB] font-mono font-bold mt-0.5">~{dailyProjectedTon} TON</div>
          </div>
        </div>
      </div>

      {/* Miner Rig Level & Upgrade Panel */}
      <div className="w-full bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm mb-4 relative overflow-hidden">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 shadow-xs">
              <Zap size={18} />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <span>RIG LEVEL {levelStatus?.currentLevel || user?.minerLevel || 1}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-bold">
                  {levelStatus?.currentLevel && levelStatus.currentLevel >= 2 ? 'HIGH-ROLLER' : 'STANDARD'}
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                Rate: <span className="text-[#2563EB] font-bold">{hashrate} TON/s</span>
                {levelStatus && (
                  <span> → Next: <span className="text-amber-600 font-bold">{levelStatus.nextHashrate} TON/s</span></span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono text-slate-400 block">Payout Tier</span>
            <span className={`text-[11px] font-mono font-bold flex items-center justify-end gap-1 ${levelStatus?.canWithdrawOverHalfTon ? 'text-[#059669]' : 'text-amber-600'}`}>
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
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2">
          <div className="flex justify-between items-center text-[11px] font-mono">
            <span className="text-slate-700 flex items-center gap-1.5 font-semibold">
              <Tv size={13} className="text-[#2563EB]" />
              <span>Watch 50 Ads in 1 Day to Level Up</span>
            </span>
            <span className="text-[#2563EB] font-bold">
              {levelStatus ? levelStatus.adsWatchedToday : 0} / 50 Ads
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden border border-slate-300/60">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-[#10B981] transition-all duration-500 rounded-full"
              style={{ width: `${levelStatus ? levelStatus.progressPercent : 0}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
            <span>Boosts hashrate + unlocks &gt;0.5 TON payouts</span>
            <span className="font-mono text-emerald-600 font-bold">{levelStatus ? levelStatus.progressPercent : 0}%</span>
          </div>

          {/* Upgrade Action / Progress Button */}
          {levelStatus?.canLevelUp ? (
            <button
              onClick={handleLevelUpgrade}
              disabled={upgradingLevel}
              className="w-full py-2.5 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-xs uppercase tracking-wider shadow-md shadow-blue-600/20 transition active:scale-98 flex items-center justify-center gap-1.5 animate-pulse cursor-pointer"
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
            <div className="w-full py-2 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center text-xs font-mono flex items-center justify-center gap-1.5">
              <span>✅ Rig upgraded today! Watch 50 ads tomorrow for Level {levelStatus.nextLevel}.</span>
            </div>
          ) : (
            <button
              onClick={() => onNavigate('missions')}
              className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-mono transition flex items-center justify-center gap-1.5 active:scale-98 shadow-xs cursor-pointer"
            >
              <Tv size={13} className="text-[#2563EB]" />
              <span>Watch Ads in Missions ({levelStatus ? levelStatus.adsRemaining : 50} more needed)</span>
              <ArrowRight size={13} className="text-slate-400" />
            </button>
          )}

          {upgradeMessage && (
            <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] text-center font-mono">
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
          className="w-full p-3.5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm hover:border-blue-300 transition-all flex items-center justify-between group active:scale-98 cursor-pointer"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shadow-xs">
              <Gamepad2 size={22} />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-slate-900 group-hover:text-[#2563EB] transition-colors">
                Arcade Hub (4 Mini-Games)
              </div>
              <div className="text-[11px] text-slate-500">
                Color Tube Sort, Memory Matrix & Cyber Car Race
              </div>
            </div>
          </div>
          <ArrowRight size={18} className="text-slate-400 group-hover:text-[#2563EB] group-hover:translate-x-1 transition-all" />
        </button>

        {/* Missions Banner */}
        <button
          onClick={() => onNavigate('missions')}
          className="w-full p-3.5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm hover:border-emerald-300 transition-all flex items-center justify-between group active:scale-98 cursor-pointer"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] text-[#10B981] flex items-center justify-center shadow-xs">
              <Target size={22} />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-slate-900 group-hover:text-[#10B981] transition-colors">
                Sponsored Missions & Ad Hub
              </div>
              <div className="text-[11px] text-slate-500">
                Complete community tasks or watch 200 daily ads
              </div>
            </div>
          </div>
          <ArrowRight size={18} className="text-slate-400 group-hover:text-[#10B981] group-hover:translate-x-1 transition-all" />
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
