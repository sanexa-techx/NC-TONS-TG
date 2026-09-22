import React, { useState } from 'react';
import WebApp from '@twa-dev/sdk';
import { Copy, Check } from 'lucide-react';
import { UserProfile } from '../types/index.js';
import { ProfileModal } from './ProfileModal.js';

interface UserProfileHeaderProps {
  user: UserProfile | null;
  livePowerPercentage?: number;
  liveTonBalance?: string;
  className?: string;
}

export const UserProfileHeader: React.FC<UserProfileHeaderProps> = ({
  user,
  livePowerPercentage = 100,
  liveTonBalance,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!user) return null;

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
  const isPowerActive = livePowerPercentage > 0;

  // Power dot color
  const dotColor =
    livePowerPercentage > 20
      ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
      : livePowerPercentage > 0
      ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
      : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]';

  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        className={`group flex items-center gap-2.5 px-2.5 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800/80 border border-cyber-border/70 hover:border-cyber-cyan/50 transition-all cursor-pointer select-none shadow-sm ${className}`}
        role="button"
        tabIndex={0}
        title="View full operator profile"
      >
        {/* Real Avatar with Live Power Dot */}
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 rounded-full p-[1.5px] bg-gradient-to-tr from-cyber-cyan to-cyber-blue shadow-sm">
            <div className="w-full h-full rounded-full overflow-hidden bg-slate-950 flex items-center justify-center">
              {!imgError ? (
                <img
                  src={avatarUrl}
                  alt={user.firstName}
                  className="w-full h-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-cyber-cyan/30 to-cyber-purple/40 flex items-center justify-center text-xs font-black text-cyber-cyan font-mono">
                  {initial}
                </div>
              )}
            </div>
          </div>

          {/* Status Dot */}
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${dotColor} ${
              isPowerActive ? 'animate-pulse' : ''
            }`}
          />
        </div>

        {/* User Name & Miner Level Badge */}
        <div className="flex flex-col min-w-0 pr-1">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-bold text-xs text-white truncate max-w-[85px]">
              {user.firstName}
            </span>
            <span className="text-[9px] font-mono font-extrabold px-1 py-0.2 rounded bg-cyber-blue/20 text-cyber-cyan border border-cyber-cyan/30 leading-tight">
              LVL {minerLevel}
            </span>
          </div>

          {/* Click-to-copy TG ID */}
          <button
            onClick={handleCopyId}
            className="flex items-center gap-1 mt-0.5 text-[10px] font-mono text-slate-400 hover:text-cyber-cyan transition-colors text-left"
            title="Click to copy Telegram ID"
          >
            <span className="opacity-70">ID:</span>
            <span>{user.id}</span>
            {copied ? (
              <Check size={10} className="text-emerald-400" />
            ) : (
              <Copy size={10} className="opacity-50 group-hover:opacity-100" />
            )}
          </button>
        </div>
      </div>

      {/* High-Resolution Detailed Profile Sheet / Modal */}
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
