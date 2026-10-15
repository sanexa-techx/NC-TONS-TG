import React, { useState, useEffect } from 'react';
import { Mission } from '../types/index.js';
import { Send, Globe, Bot, CheckCircle2, ArrowUpRight, Loader2, Camera, Clock, Trash2 } from 'lucide-react';
import { TonIcon, NcIcon } from './icons/index.js';
import { useTelegram } from '../hooks/useTelegram.js';
import { api } from '../services/api.js';
import ScreenshotProofModal from './ScreenshotProofModal.js';

interface MissionCardProps {
  mission: Mission;
  userId?: number | string;
  onClaim: (missionId: number) => Promise<any>;
  onProofSubmitted?: () => void;
  isAdmin?: boolean;
  onDelete?: (missionId: number) => void;
}

export const MissionCard: React.FC<MissionCardProps> = ({
  mission,
  userId,
  onClaim,
  onProofSubmitted,
  isAdmin,
  onDelete,
}) => {
  const { openLink, haptic } = useTelegram();
  const [visited, setVisited] = useState(false);
  const [countdown, setCountdown] = useState<number>(0);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [proofModalOpen, setProofModalOpen] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const isScreenshotTask = Boolean(mission.requiresProof || mission.taskType === 'screenshot_social');

  const getTaskIcon = () => {
    if (isScreenshotTask) {
      return <Camera size={18} className="text-yellow-400" />;
    }
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
    setClaimError(null);
    // Register 15s visit session in backend
    api.startVisitMission(mission.id, userId).catch(() => {});
    api.startMission(mission.id).catch(() => {});
    // Start mandatory 15s dwell timer
    setCountdown(15);
  };

  const handleClaim = async () => {
    if (!visited) {
      setClaimError('Please open and engage with the partner site before claiming.');
      haptic('error');
      return;
    }
    if (countdown > 0) {
      setClaimError(`Stay on the partner site for at least 15 seconds. (${countdown}s left)`);
      haptic('error');
      return;
    }

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
    <div className={`p-4 rounded-2xl border transition-all mb-3 relative overflow-hidden ${
      isCompleted
        ? 'border-emerald-200 bg-[#ECFDF5] shadow-xs'
        : isSoldOut
        ? 'border-[#E2E8F0] bg-slate-50 opacity-60'
        : 'bg-white border-[#E2E8F0] hover:border-blue-300 shadow-xs'
    }`}>
      {/* Category Pill */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            {getTaskIcon()}
          </div>
          <span className="text-[11px] font-mono uppercase text-slate-500 font-semibold">
            {mission.category}
          </span>
        </div>

        {/* Dual Reward Badges & Optional Admin Action */}
        <div className="flex items-center space-x-1.5">
          <div className="px-2 py-0.5 rounded-full bg-[#ECFDF5] border border-emerald-200 text-[11px] font-mono font-bold text-[#10B981] flex items-center space-x-1">
            <NcIcon className="w-4 h-4" />
            <span>+{mission.ncReward} NC</span>
          </div>
          {parseFloat(mission.tonReward) > 0 && (
            <div className="px-2 py-0.5 rounded-full bg-[#EFF6FF] border border-blue-200 text-[11px] font-mono font-bold text-[#2563EB] flex items-center space-x-1">
              <TonIcon className="w-4 h-4" />
              <span>+{mission.tonReward} TON</span>
            </div>
          )}
          {isAdmin && onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(mission.id);
              }}
              className="p-1 rounded-lg text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-all ml-1 shadow-2xs"
              title="Admin: Delete Mission"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Title & Description */}
      <h4 className="text-sm font-bold text-slate-900 mb-1">{mission.title}</h4>
      <p className="text-xs text-slate-500 mb-3 line-clamp-2">{mission.description}</p>

      {/* Quota Progress */}
      {mission.targetUsers && (
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-mono">
            <span>Claims:</span>
            <span>
              {mission.completedCount} / {mission.targetUsers}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[#2563EB] h-1.5 rounded-full"
              style={{
                width: `${Math.min(100, (mission.completedCount / mission.targetUsers) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {isCompleted ? (
        <div className="w-full py-2 px-3 rounded-xl bg-emerald-100 border border-emerald-300 text-[#059669] text-xs font-bold flex items-center justify-center space-x-1.5">
          <CheckCircle2 size={16} />
          <span>Completed & Claimed</span>
        </div>
      ) : isSoldOut ? (
        <div className="w-full py-2 px-3 rounded-xl bg-slate-100 text-slate-400 text-xs font-semibold text-center">
          Reward Budget Exhausted
        </div>
      ) : isScreenshotTask ? (
        mission.proofStatus === 'PENDING_REVIEW' ? (
          <div className="w-full py-2 px-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold flex items-center justify-center space-x-1.5">
            <Clock size={16} className="animate-spin" />
            <span>⏳ Screenshot In Review</span>
          </div>
        ) : mission.proofStatus === 'REJECTED' ? (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleActionClick}
              className="flex-1 py-2 px-3 rounded-xl bg-[#F8FAFC] hover:bg-slate-100 border border-[#E2E8F0] text-xs font-semibold text-slate-700 flex items-center justify-center space-x-1 transition-all active:scale-95"
            >
              <span>Open Link</span>
              <ArrowUpRight size={14} className="text-[#2563EB]" />
            </button>
            <button
              onClick={() => setProofModalOpen(true)}
              className="flex-1 py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-bold flex items-center justify-center space-x-1 transition-all active:scale-95"
            >
              <Camera size={14} />
              <span>Retry Proof</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleActionClick}
              className="flex-1 py-2 px-3 rounded-xl bg-[#F8FAFC] hover:bg-slate-100 border border-[#E2E8F0] text-xs font-semibold text-slate-700 flex items-center justify-center space-x-1 transition-all active:scale-95"
            >
              <span>Open Link</span>
              <ArrowUpRight size={14} className="text-[#2563EB]" />
            </button>
            <button
              onClick={() => setProofModalOpen(true)}
              className="flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all active:scale-95 bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xs"
            >
              <Camera size={14} />
              <span>Submit Proof</span>
            </button>
          </div>
        )
      ) : (
        <div className="flex items-center space-x-2">
          <button
            onClick={handleActionClick}
            className="flex-1 py-2 px-3 rounded-xl bg-[#F8FAFC] hover:bg-slate-100 border border-[#E2E8F0] text-xs font-semibold text-slate-700 flex items-center justify-center space-x-1 transition-all active:scale-95"
          >
            <span>{visited ? 'Re-open Link' : 'Open Link'}</span>
            <ArrowUpRight size={14} className="text-[#2563EB]" />
          </button>

          <button
            onClick={handleClaim}
            disabled={claiming || !visited || countdown > 0}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1 transition-all active:scale-95 ${
              !visited
                ? 'bg-slate-100 border border-[#E2E8F0] text-slate-400 cursor-not-allowed opacity-75'
                : countdown > 0
                ? 'bg-amber-50 border border-amber-300 text-amber-800 cursor-wait shadow-xs'
                : 'bg-[#10B981] hover:bg-[#059669] text-white shadow-xs font-extrabold'
            }`}
          >
            {claiming ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Verifying...</span>
              </>
            ) : countdown > 0 ? (
              <>
                <Clock size={14} className="animate-pulse text-amber-600" />
                <span>Visiting ({countdown}s)</span>
              </>
            ) : (
              <span>Claim Reward</span>
            )}
          </button>
        </div>
      )}

      {claimError && (
        <div className="mt-2 text-[11px] text-cyber-red font-medium">
          ⚠️ {claimError}
        </div>
      )}

      {/* Screenshot Proof Modal */}
      {proofModalOpen && (
        <ScreenshotProofModal
          mission={mission}
          userId={userId || ''}
          onClose={() => setProofModalOpen(false)}
          onSubmitted={() => {
            setProofModalOpen(false);
            onProofSubmitted?.();
          }}
        />
      )}
    </div>
  );
};
