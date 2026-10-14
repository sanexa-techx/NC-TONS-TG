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
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border border-[#E2E8F0] rounded-3xl w-full max-w-sm p-6 text-slate-800 space-y-5 relative shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
          aria-label="Close profile"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Profile Avatar & Display */}
        <div className="flex flex-col items-center text-center space-y-2 pt-2">
          <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-[#10B981] bg-slate-50 shadow-md flex items-center justify-center">
            {avatarUrl && !imgError ? (
              <img
                src={avatarUrl}
                alt={user.firstName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
              />
            ) : (
              <span className="text-3xl font-black text-[#10B981] font-mono">{initial}</span>
            )}
          </div>

          <h3 className="font-extrabold text-base leading-tight mt-1 text-slate-900">{user.firstName}</h3>

          {user.username && (
            <span className="text-xs text-slate-500 font-mono">@{user.username}</span>
          )}

          {/* Telegram ID Copy Badge */}
          <button
            onClick={handleCopyId}
            className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1.5 rounded-xl text-xs font-mono text-slate-700 hover:border-blue-300 transition-colors active:scale-95"
          >
            <Terminal className="w-3.5 h-3.5 text-slate-400" />
            <span>ID: {user.id}</span>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-[#10B981]" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          {/* Owner / System Admin Tag */}
          {user.isAdmin && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-600 text-[11px] font-mono font-bold mt-1 shadow-2xs">
              <Shield className="w-3.5 h-3.5 text-red-600" />
              <span>OWNER / SYSTEM ADMIN DETECTED</span>
            </div>
          )}
        </div>

        {/* Admin Verified Privilege Card */}
        {user.isAdmin && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600 shadow-2xs">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] text-red-700 uppercase font-semibold">
                  Access Level
                </span>
                <h4 className="text-xs font-bold text-slate-900">Full Administrator Rights</h4>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-red-600 bg-white px-2 py-1 rounded-lg border border-red-200">
              Verified
            </span>
          </div>
        )}

        {/* Miner Rank Card */}
        <div className="bg-[#EFF6FF] border border-blue-200 rounded-2xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-[#2563EB]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] text-[#2563EB] uppercase font-semibold">
                Miner Status
              </span>
              <h4 className="text-xs font-bold text-slate-900">Tier {minerLevel} Operator</h4>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-[#2563EB] bg-white px-2 py-1 rounded-lg border border-blue-200">
            {livePowerPercentage > 0 ? 'Active' : 'Offline'}
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] space-y-1">
            <span className="block text-[10px] text-slate-500 font-semibold">Total TON</span>
            <div className="flex items-center gap-1.5 font-mono font-bold text-[#2563EB]">
              <TonIcon className="w-3.5 h-3.5" />
              <span>{tonDisplayNum}</span>
            </div>
          </div>

          <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] space-y-1">
            <span className="block text-[10px] text-slate-500 font-semibold">Total NC Fuel</span>
            <div className="flex items-center gap-1.5 font-mono font-bold text-[#10B981]">
              <NcIcon className="w-3.5 h-3.5" />
              <span>{ncDisplay}</span>
            </div>
          </div>
        </div>

        {/* Referral count row */}
        {user.referralCount !== undefined && (
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-500">Recruited Crew</span>
            <span className="font-bold text-slate-800">{user.referralCount} miners</span>
          </div>
        )}

        {/* Legal & Compliance Links */}
        <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-center gap-3 text-[11px] font-mono text-slate-500">
          <button
            onClick={() => setLegalTab('terms')}
            className="hover:text-[#2563EB] underline underline-offset-4 transition-colors"
          >
            Terms & Conditions
          </button>
          <span>•</span>
          <button
            onClick={() => setLegalTab('privacy')}
            className="hover:text-[#2563EB] underline underline-offset-4 transition-colors"
          >
            Privacy Policy
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl transition-colors shadow-xs"
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
