import React, { useState } from 'react';
import WebApp from '@twa-dev/sdk';
import { Copy, Check } from 'lucide-react';
import { UserProfile } from '../types/index.js';
import { ProfileModal } from './ProfileModal.js';

interface UserProfileHeaderProps {
  user: UserProfile | null;
  livePowerPercentage?: number;
  liveTonBalance?: string;
}

export const UserProfileHeader: React.FC<UserProfileHeaderProps> = ({
  user,
  livePowerPercentage = 100,
  liveTonBalance,
}) => {
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  if (!user) return null;

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
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
  const isPowerActive = livePowerPercentage > 0;

  return (
    <>
      {/* User Info Capsule — click opens full profile modal */}
      <div
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2.5 cursor-pointer active:scale-[0.98] transition select-none"
        role="button"
        tabIndex={0}
        aria-label="Open operator profile"
      >
        {/* Avatar with power ring indicator */}
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-emerald-400/80 bg-slate-900 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.35)]">
            {avatarUrl && !imgError ? (
              <img
                src={avatarUrl}
                alt={user.firstName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
              />
            ) : (
              <span className="font-extrabold text-sm text-emerald-400 font-mono">{initial}</span>
            )}
          </div>

          {/* Live power status dot */}
          <span
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-950 ${
              isPowerActive ? 'bg-[#10B981] shadow-[0_0_8px_#10B981]' : 'bg-[#DC2626] animate-pulse shadow-[0_0_8px_#DC2626]'
            }`}
          />
        </div>

        {/* Name & Telegram ID pill */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-black text-xs text-white truncate max-w-[110px]">
              {user.firstName}
            </span>
            <span className="text-[9px] bg-blue-600/20 text-blue-300 font-bold px-1.5 rounded-full border border-blue-400/50 leading-4 shadow-2xs">
              LVL {minerLevel}
            </span>
            {user.isAdmin && (
              <span className="text-[9px] bg-red-950/60 text-red-300 font-bold px-1.5 rounded-full border border-red-500/50 flex items-center gap-0.5 leading-4 shadow-2xs">
                🛡️ ADMIN
              </span>
            )}
          </div>

          {/* Clickable Telegram ID with copy pill */}
          <button
            onClick={handleCopyId}
            className="flex items-center gap-1 text-[10px] font-mono text-slate-400 hover:text-slate-200 mt-0.5 transition-colors text-left"
            aria-label="Copy Telegram ID"
          >
            <span>ID: {user.id}</span>
            {copied ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-2.5 h-2.5 text-slate-500 hover:text-slate-300" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded profile modal */}
      <ProfileModal
        user={user}
        livePowerPercentage={livePowerPercentage}
        liveTonBalance={liveTonBalance}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
