import React, { useState } from 'react';
import { Shield, User, RefreshCw } from 'lucide-react';
import { setDevUser } from '../services/api.js';

interface DevTelegramBarProps {
  currentUserId: string;
  isAdmin: boolean;
  onUserChanged: () => void;
  onSync: () => void;
}

export const DevTelegramBar: React.FC<DevTelegramBarProps> = ({
  currentUserId,
  isAdmin,
  onUserChanged,
  onSync,
}) => {
  const isInsideTelegram = Boolean((window as any).Telegram?.WebApp?.initData);
  const [showDropdown, setShowDropdown] = useState(false);

  // If inside real Telegram Mini App, no need to show developer switcher
  if (isInsideTelegram) return null;

  const handleSwitchToAdmin = () => {
    // 123456789 is configured as default admin in .env.example
    setDevUser('123456789', 'AdminMiner');
    onUserChanged();
    setShowDropdown(false);
  };

  const handleSwitchToRegular = () => {
    setDevUser('9990001', 'CyberMiner');
    onUserChanged();
    setShowDropdown(false);
  };

  return (
    <div className="bg-cyber-surface/90 border-b border-cyber-border text-xs py-1.5 px-3 flex items-center justify-between z-30 sticky top-0 backdrop-blur-md">
      <div className="flex items-center space-x-2">
        <span className="w-2 h-2 rounded-full bg-cyber-gold animate-ping" />
        <span className="font-mono text-slate-300 font-semibold">DEV MODE:</span>
        <span className="text-slate-400 font-mono">
          ID: {currentUserId} {isAdmin ? '(ADMIN 🛡️)' : '(MINER ⛏️)'}
        </span>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={onSync}
          title="Force Sync Mining State"
          className="p-1 rounded bg-cyber-card hover:bg-cyber-bg text-cyber-cyan border border-cyber-border"
        >
          <RefreshCw size={12} />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="px-2 py-0.5 rounded bg-cyber-cyan/15 border border-cyber-cyan/40 text-cyber-cyan font-semibold flex items-center space-x-1"
          >
            {isAdmin ? <Shield size={12} /> : <User size={12} />}
            <span>Switch Role</span>
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-1 w-44 glass-panel rounded-xl shadow-xl border border-cyber-cyan/30 py-1 z-50">
              <button
                onClick={handleSwitchToAdmin}
                className="w-full text-left px-3 py-1.5 text-xs text-cyber-cyan hover:bg-cyber-cyan/15 flex items-center space-x-2"
              >
                <Shield size={14} />
                <span>Admin (123456789)</span>
              </button>
              <button
                onClick={handleSwitchToRegular}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-cyber-surface flex items-center space-x-2"
              >
                <User size={14} />
                <span>Miner (9990001)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
