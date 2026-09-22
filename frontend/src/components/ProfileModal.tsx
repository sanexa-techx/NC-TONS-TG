import React, { useState } from 'react';
import WebApp from '@twa-dev/sdk';
import { Copy, Check, Zap, X, Shield, Calendar, Users } from 'lucide-react';
import { TonIcon, NcIcon } from './icons/index.js';
import { UserProfile } from '../types/index.js';

interface ProfileModalProps {
  user: UserProfile | null;
  livePowerPercentage?: number;
  liveTonBalance?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  user,
  livePowerPercentage = 100,
  liveTonBalance,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  if (!isOpen || !user) return null;

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(user.id);
    }
    setCopied(true);

    try {
      if (WebApp?.HapticFeedback) {
        WebApp.HapticFeedback.impactOccurred('light');
      }
    } catch {
      // Haptics fallback
    }

    setTimeout(() => setCopied(false), 2000);
  };

  const initial = (user.firstName || 'M').charAt(0).toUpperCase();
  const avatarUrl = user.photoUrl || `/api/user/avatar/${user.id}`;
  const minerLevel = user.minerLevel || 1;
  const tonDisplay = liveTonBalance || user.tonBalance || '0.000000';
  const ncDisplay = user.ncBalance ? Number(user.ncBalance).toLocaleString() : '0';

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Active Rig';

  const isPowerActive = livePowerPercentage > 0;
  const powerColor =
    livePowerPercentage > 20
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
      : livePowerPercentage > 0
      ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
      : 'text-rose-400 bg-rose-500/10 border-rose-500/30';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-gradient-to-b from-slate-900 via-cyber-card to-cyber-bg border border-cyber-cyan/30 rounded-2xl p-5 shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Effects */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-cyber-cyan/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-cyber-purple/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          aria-label="Close profile modal"
        >
          <X size={16} />
        </button>

        {/* Header with High-Res Avatar */}
        <div className="flex flex-col items-center text-center mt-2 mb-4">
          <div className="relative mb-3 group">
            <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-cyber-cyan via-cyber-blue to-cyber-purple shadow-glow-cyan">
              <div className="w-full h-full rounded-full overflow-hidden bg-slate-950 flex items-center justify-center">
                {!imgError ? (
                  <img
                    src={avatarUrl}
                    alt={user.firstName}
                    className="w-full h-full object-cover"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-cyber-cyan/20 to-cyber-purple/30 flex items-center justify-center text-2xl font-black text-cyber-cyan font-mono">
                    {initial}
                  </div>
                )}
              </div>
            </div>

            {/* Live Power Indicator Badge */}
            <div
              className={`absolute bottom-0 right-0 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold flex items-center gap-1 border shadow-sm ${powerColor}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isPowerActive ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'
                }`}
              />
              {livePowerPercentage}%
            </div>
          </div>

          <h3 className="text-lg font-black text-white tracking-wide flex items-center gap-1.5">
            {user.firstName}
            {user.isAdmin && (
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Admin
              </span>
            )}
          </h3>

          <p className="text-xs text-slate-400 font-mono mt-0.5">
            {user.username ? `@${user.username}` : 'Autonomous Miner'}
          </p>

          {/* Telegram ID Copy Capsule */}
          <button
            onClick={handleCopyId}
            className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/90 hover:bg-slate-700/90 border border-cyber-border/80 text-xs font-mono text-slate-300 hover:text-white transition-all shadow-inner"
          >
            <span className="text-[10px] text-slate-500">TG ID:</span>
            <span className="font-semibold text-cyber-cyan">{user.id}</span>
            {copied ? (
              <Check size={12} className="text-emerald-400 ml-0.5" />
            ) : (
              <Copy size={12} className="text-slate-400 group-hover:text-slate-200 ml-0.5" />
            )}
          </button>
        </div>

        {/* Miner Rank Card */}
        <div className="mb-4 bg-slate-800/50 border border-cyber-cyan/20 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/30 flex items-center justify-center text-cyber-cyan">
              <Zap size={18} className="animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-medium">
                Miner Designation
              </p>
              <p className="text-sm font-bold text-white font-mono flex items-center gap-1.5">
                Tier {minerLevel} Operator
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-cyber-blue/20 text-cyber-cyan border border-cyber-cyan/30">
            LVL {minerLevel}
          </span>
        </div>

        {/* Mined Assets Balance Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-2.5 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono uppercase tracking-wider mb-1">
              <TonIcon className="w-3.5 h-3.5" />
              <span>Total TON</span>
            </div>
            <div className="font-mono font-extrabold text-sm text-cyber-cyan truncate">
              {tonDisplay}
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-2.5 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono uppercase tracking-wider mb-1">
              <NcIcon className="w-3.5 h-3.5" />
              <span>NC Fuel</span>
            </div>
            <div className="font-mono font-extrabold text-sm text-yellow-400 truncate">
              {ncDisplay}
            </div>
          </div>
        </div>

        {/* Telemetry Info Rows */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 space-y-2 text-xs font-mono mb-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5 text-[11px]">
              <Users size={12} className="text-slate-500" />
              Recruited Crew
            </span>
            <span className="font-bold text-slate-200">
              {user.referralCount || 0} miners
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5 text-[11px]">
              <Calendar size={12} className="text-slate-500" />
              Registered Since
            </span>
            <span className="text-slate-300 text-[11px]">{memberSince}</span>
          </div>

          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5 text-[11px]">
              <Shield size={12} className="text-slate-500" />
              Telegram Bot Link
            </span>
            <span className="text-emerald-400 text-[11px] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Verified
            </span>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-mono font-bold text-xs uppercase tracking-wider transition-colors shadow-sm"
        >
          Close Profile
        </button>
      </div>
    </div>
  );
};
