import React, { useState } from 'react';
import { Mission } from '../types/index.js';
import { Send, Globe, Bot, CheckCircle2, ArrowUpRight, Loader2, Coins } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram.js';

interface MissionCardProps {
  mission: Mission;
  onClaim: (missionId: number) => Promise<any>;
}

export const MissionCard: React.FC<MissionCardProps> = ({ mission, onClaim }) => {
  const { openLink, haptic } = useTelegram();
  const [visited, setVisited] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const getTaskIcon = () => {
    switch (mission.taskType) {
      case 'telegram_join':
        return <Send size={18} className="text-cyber-cyan" />;
      case 'bot_launch':
        return <Bot size={18} className="text-cyber-gold" />;
      default:
        return <Globe size={18} className="text-cyber-blue" />;
    }
  };

  const handleActionClick = () => {
    haptic('light');
    openLink(mission.actionUrl);
    setVisited(true);
  };

  const handleClaim = async () => {
    setClaiming(true);
    setClaimError(null);
    try {
      await onClaim(mission.id);
      haptic('success');
    } catch (err) {
      setClaimError((err as Error).message || 'Claim verification failed');
      haptic('error');
    } finally {
      setClaiming(false);
    }
  };

  const isCompleted = mission.isCompleted;
  const isSoldOut = mission.isSoldOut;

  return (
    <div className={`glass-panel p-4 rounded-2xl border transition-all mb-3 relative overflow-hidden ${
      isCompleted
        ? 'border-cyber-green/30 bg-cyber-green/5'
        : isSoldOut
        ? 'border-cyber-border opacity-60'
        : 'border-cyber-border hover:border-cyber-cyan/40 shadow-sm'
    }`}>
      {/* Category Pill */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-cyber-surface border border-cyber-border">
            {getTaskIcon()}
          </div>
          <span className="text-[11px] font-mono uppercase text-slate-400">
            {mission.category}
          </span>
        </div>

        {/* Dual Reward Badges */}
        <div className="flex items-center space-x-1.5">
          <div className="px-2 py-0.5 rounded-full bg-cyber-gold/15 border border-cyber-gold/30 text-[11px] font-mono font-bold text-cyber-gold flex items-center space-x-1">
            <Coins size={10} />
            <span>+{mission.ncReward} NC</span>
          </div>
          {parseFloat(mission.tonReward) > 0 && (
            <div className="px-2 py-0.5 rounded-full bg-cyber-cyan/15 border border-cyber-cyan/30 text-[11px] font-mono font-bold text-cyber-cyan">
              +{mission.tonReward} TON
            </div>
          )}
        </div>
      </div>

      {/* Title & Description */}
      <h4 className="text-sm font-bold text-white mb-1">{mission.title}</h4>
      <p className="text-xs text-slate-400 mb-3 line-clamp-2">{mission.description}</p>

      {/* Quota Progress */}
      {mission.targetUsers && (
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-mono">
            <span>Claims:</span>
            <span>
              {mission.completedCount} / {mission.targetUsers}
            </span>
          </div>
          <div className="w-full bg-cyber-bg rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-cyber-cyan h-1.5 rounded-full"
              style={{
                width: `${Math.min(100, (mission.completedCount / mission.targetUsers) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {isCompleted ? (
        <div className="w-full py-2 px-3 rounded-xl bg-cyber-green/10 border border-cyber-green/30 text-cyber-green text-xs font-bold flex items-center justify-center space-x-1.5">
          <CheckCircle2 size={16} />
          <span>Completed & Claimed</span>
        </div>
      ) : isSoldOut ? (
        <div className="w-full py-2 px-3 rounded-xl bg-cyber-surface text-slate-500 text-xs font-semibold text-center">
          Reward Budget Exhausted
        </div>
      ) : (
        <div className="flex items-center space-x-2">
          <button
            onClick={handleActionClick}
            className="flex-1 py-2 px-3 rounded-xl bg-cyber-surface hover:bg-cyber-card border border-cyber-border text-xs font-semibold text-slate-200 flex items-center justify-center space-x-1 transition-all active:scale-95"
          >
            <span>Open Link</span>
            <ArrowUpRight size={14} className="text-cyber-cyan" />
          </button>

          <button
            onClick={handleClaim}
            disabled={claiming}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1 transition-all active:scale-95 ${
              visited
                ? 'bg-gradient-to-r from-cyber-cyan to-cyber-blue text-cyber-bg shadow-glow-cyan font-extrabold'
                : 'bg-cyber-card border border-cyber-cyan/40 text-cyber-cyan hover:bg-cyber-cyan/10'
            }`}
          >
            {claiming ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Checking...</span>
              </>
            ) : (
              <span>Verify & Claim</span>
            )}
          </button>
        </div>
      )}

      {claimError && (
        <div className="mt-2 text-[11px] text-cyber-red font-medium">
          ⚠️ {claimError}
        </div>
      )}
    </div>
  );
};
