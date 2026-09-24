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

  const [imgError, setImgError] = useState(false);
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
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-yellow-500/60 bg-neutral-800 flex items-center justify-center shadow-md">
            {avatarUrl && !imgError ? (
              <img
                src={avatarUrl}
                alt={user.firstName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
              />
            ) : (
              <span className="font-bold text-sm text-yellow-400 font-mono">{initial}</span>
            )}
          </div>

          {/* Live power status dot */}
          <span
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-neutral-900 ${
              isPowerActive ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'
            }`}
          />
        </div>

        {/* Name & Telegram ID pill */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-xs text-white truncate max-w-[110px]">
              {user.firstName}
            </span>
            <span className="text-[9px] bg-yellow-500/10 text-yellow-400 font-mono px-1.5 rounded border border-yellow-500/30 leading-5">
              LVL {minerLevel}
            </span>
            {user.isAdmin && (
              <span className="text-[9px] bg-red-500/20 text-red-400 font-mono px-1.5 rounded border border-red-500/40 flex items-center gap-0.5 leading-5 font-bold shadow-sm animate-pulse">
                🛡️ ADMIN
              </span>
            )}
          </div>

          {/* Clickable Telegram ID with copy pill */}
          <button
            onClick={handleCopyId}
            className="flex items-center gap-1 text-[10px] font-mono text-neutral-400 hover:text-neutral-200 mt-0.5 transition-colors text-left"
            aria-label="Copy Telegram ID"
          >
            <span>ID: {user.id}</span>
            {copied ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-2.5 h-2.5 text-neutral-500" />
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
