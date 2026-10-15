import React, { useState } from 'react';
import WebApp from '@twa-dev/sdk';
import { X, Copy, Check, Shield, Terminal } from 'lucide-react';
import { TonIcon } from './icons/index.js';
import { NcIcon } from './icons/index.js';
import { UserProfile } from '../types/index.js';
import { LegalModal } from './LegalModal.js';

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
  const [legalTab, setLegalTab] = useState<'terms' | 'privacy' | null>(null);

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
  const parsedTon = parseFloat(tonDisplay);
  const tonDisplayNum = isNaN(parsedTon) ? '0.00000' : parsedTon.toFixed(5);

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-3xl w-full max-w-sm p-6 text-slate-100 space-y-5 relative shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
          aria-label="Close profile"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Profile Avatar & Display */}
        <div className="flex flex-col items-center text-center space-y-2 pt-2">
          <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-emerald-400 bg-slate-950 shadow-md flex items-center justify-center">
            {avatarUrl && !imgError ? (
              <img
                src={avatarUrl}
                alt={user.firstName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
              />
            ) : (
              <span className="text-3xl font-black text-emerald-400 font-mono">{initial}</span>
            )}
          </div>

          <h3 className="font-extrabold text-base leading-tight mt-1 text-white">{user.firstName}</h3>

          {user.username && (
            <span className="text-xs text-slate-400 font-mono">@{user.username}</span>
          )}

          {/* Telegram ID Copy Badge */}
          <button
            onClick={handleCopyId}
            className="flex items-center gap-1.5 bg-slate-950/70 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-300 hover:border-blue-400/50 transition-colors active:scale-95"
          >
            <Terminal className="w-3.5 h-3.5 text-slate-400" />
            <span>ID: {user.id}</span>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          {/* Owner / System Admin Tag */}
          {user.isAdmin && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-[11px] font-mono font-bold mt-1 shadow-xs">
              <Shield className="w-3.5 h-3.5 text-red-400" />
              <span>OWNER / SYSTEM ADMIN DETECTED</span>
            </div>
          )}
        </div>

        {/* Admin Verified Privilege Card */}
        {user.isAdmin && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shadow-xs">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] text-red-400 uppercase font-semibold">
                  Access Level
                </span>
                <h4 className="text-xs font-bold text-white">Full Administrator Rights</h4>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-red-300 bg-red-500/20 px-2 py-1 rounded-lg border border-red-500/40">
              Verified
            </span>
          </div>
        )}

        {/* Miner Rank Card */}
        <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] text-blue-400 uppercase font-semibold">
                Miner Status
              </span>
              <h4 className="text-xs font-bold text-white">Tier {minerLevel} Operator</h4>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-blue-300 bg-blue-500/20 px-2 py-1 rounded-lg border border-blue-500/40">
            {livePowerPercentage > 0 ? 'Active' : 'Offline'}
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-950/70 p-3 rounded-xl border border-white/10 space-y-1">
            <span className="block text-[10px] text-slate-400 font-semibold">Total TON</span>
            <div className="flex items-center gap-1.5 font-mono font-bold text-blue-400">
              <TonIcon className="w-3.5 h-3.5" />
              <span>{tonDisplayNum}</span>
            </div>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-white/10 space-y-1">
            <span className="block text-[10px] text-slate-400 font-semibold">Total NC Fuel</span>
            <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-400">
              <NcIcon className="w-3.5 h-3.5" />
              <span>{ncDisplay}</span>
            </div>
          </div>
        </div>

        {/* Referral count row */}
        {user.referralCount !== undefined && (
          <div className="bg-slate-950/70 border border-white/10 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Recruited Crew</span>
            <span className="font-bold text-white">{user.referralCount} miners</span>
          </div>
        )}

        {/* Legal & Compliance Links */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-center gap-3 text-[11px] font-mono text-slate-400">
          <button
            onClick={() => setLegalTab('terms')}
            className="hover:text-blue-400 underline underline-offset-4 transition-colors"
          >
            Terms & Conditions
          </button>
          <span>•</span>
          <button
            onClick={() => setLegalTab('privacy')}
            className="hover:text-blue-400 underline underline-offset-4 transition-colors"
          >
            Privacy Policy
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)]"
        >
          Close Profile
        </button>
      </div>

      {/* Embedded Legal Modal */}
      <LegalModal
        isOpen={legalTab !== null}
        initialTab={legalTab || 'terms'}
        onClose={() => setLegalTab(null)}
      />
    </div>
  );
};
