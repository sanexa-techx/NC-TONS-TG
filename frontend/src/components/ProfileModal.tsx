import React, { useState } from 'react';
import WebApp from '@twa-dev/sdk';
import { X, Copy, Check, Shield, Terminal } from 'lucide-react';
import { TonIcon } from './icons/index.js';
import { NcIcon } from './icons/index.js';
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

  if (!isOpen || !user) return null;

  const handleCopyId = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(user.id.toString());
    }
    setCopied(true);
    try {
      if (WebApp?.HapticFeedback) {
        WebApp.HapticFeedback.notificationOccurred('success');
      }
    } catch {
      // Haptics not available in dev
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const initial = user.firstName ? user.firstName.charAt(0).toUpperCase() : '?';
  const avatarUrl = user.photoUrl || null;
  const minerLevel = user.minerLevel || 1;
  const tonDisplay = liveTonBalance || user.tonBalance || '0.000000';
  const ncDisplay = user.ncBalance ? Number(user.ncBalance).toLocaleString() : '0';
  const tonDisplayNum = parseFloat(tonDisplay).toFixed(5);

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-sm p-6 text-white space-y-5 relative shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          aria-label="Close profile"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Profile Avatar & Display */}
        <div className="flex flex-col items-center text-center space-y-2 pt-2">
          <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-yellow-500/80 bg-neutral-950 shadow-[0_0_25px_rgba(234,179,8,0.25)] flex items-center justify-center">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={user.firstName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-3xl font-black text-yellow-400 font-mono">{initial}</span>
            )}
          </div>

          <h3 className="font-extrabold text-base leading-tight mt-1">{user.firstName}</h3>

          {user.username && (
            <span className="text-xs text-neutral-400 font-mono">@{user.username}</span>
          )}

          {/* Telegram ID Copy Badge */}
          <button
            onClick={handleCopyId}
            className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 px-3 py-1.5 rounded-xl text-xs font-mono text-yellow-400 hover:border-yellow-500/50 transition-colors active:scale-95"
          >
            <Terminal className="w-3.5 h-3.5 text-neutral-400" />
            <span>ID: {user.id}</span>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-neutral-400" />
            )}
          </button>

          {/* Owner / System Admin Tag */}
          {user.isAdmin && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[11px] font-mono font-bold mt-1 shadow-sm">
              <Shield className="w-3.5 h-3.5 text-red-400" />
              <span>OWNER / SYSTEM ADMIN DETECTED</span>
            </div>
          )}
        </div>

        {/* Admin Verified Privilege Card */}
        {user.isAdmin && (
          <div className="bg-red-950/30 border border-red-500/30 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shadow-sm">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] text-red-300 uppercase font-semibold">
                  Access Level
                </span>
                <h4 className="text-xs font-bold text-white">Full Administrator Rights</h4>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-red-400 bg-red-950/60 px-2 py-1 rounded-lg border border-red-500/30">
              Verified
            </span>
          </div>
        )}

        {/* Miner Rank Card */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] text-neutral-400 uppercase font-semibold">
                Miner Status
              </span>
              <h4 className="text-xs font-bold text-white">Tier {minerLevel} Operator</h4>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/40 px-2 py-1 rounded-lg border border-cyan-500/20">
            {livePowerPercentage > 0 ? 'Active' : 'Offline'}
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800/80 space-y-1">
            <span className="block text-[10px] text-neutral-400">Total TON</span>
            <div className="flex items-center gap-1.5 font-mono font-bold text-white">
              <TonIcon className="w-3.5 h-3.5" />
              <span>{tonDisplayNum}</span>
            </div>
          </div>

          <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800/80 space-y-1">
            <span className="block text-[10px] text-neutral-400">Total NC Fuel</span>
            <div className="flex items-center gap-1.5 font-mono font-bold text-white">
              <NcIcon className="w-3.5 h-3.5" />
              <span>{ncDisplay}</span>
            </div>
          </div>
        </div>

        {/* Referral count row */}
        {user.referralCount !== undefined && (
          <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs font-mono">
            <span className="text-neutral-400">Recruited Crew</span>
            <span className="font-bold text-neutral-200">{user.referralCount} miners</span>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs rounded-xl transition-colors"
        >
          Close Profile
        </button>
      </div>
    </div>
  );
};
