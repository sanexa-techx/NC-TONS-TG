import React, { useState } from 'react';
import { UserProfile, MiningState } from '../types/index.js';
import { DualCurrencyBar } from '../components/DualCurrencyBar.js';
import { CircularBatteryGauge } from '../components/CircularBatteryGauge.js';
import { RechargeModal } from '../components/RechargeModal.js';
import DailyCheckInBanner from '../components/DailyCheckInBanner.js';
import { Gamepad2, Target, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAdManager } from '../hooks/useAdManager.js';

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
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const { triggerInterstitial } = useAdManager(user?.id || '');

  const hashrate = mining ? mining.tonHashratePerSec : '0.00000100';
  const capacityHours = mining ? mining.powerCapacityHours : 8;

  // Daily projected TON calculation (if 100% powered)
  const dailyProjectedTon = (parseFloat(hashrate) * 86400).toFixed(4);

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto px-4 pb-24 pt-2">
      {/* Header Info */}
      <div className="w-full flex items-center justify-between py-2 mb-2">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyber-cyan to-cyber-blue p-0.5 shadow-glow-cyan/50">
            <div className="w-full h-full bg-cyber-bg rounded-2xl flex items-center justify-center font-bold text-cyber-cyan text-sm">
              {user?.firstName?.charAt(0) || 'M'}
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-sm text-white">{user?.firstName || 'Miner'}</span>
              {user?.isAdmin && (
                <span title="Verified Admin">
                  <ShieldCheck size={14} className="text-cyber-cyan" />
                </span>
              )}
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              {user?.id ? `ID: ${user.id}` : ''}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-cyber-card/80 border border-cyber-border text-xs font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-cyber-cyan animate-pulse" />
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">NODE ONLINE</span>
        </div>
      </div>

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
