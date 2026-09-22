import React from 'react';
import { Coins } from 'lucide-react';

interface DualCurrencyBarProps {
  tonBalance: string;
  ncBalance: string | number;
  isMiningActive?: boolean;
}

export const DualCurrencyBar: React.FC<DualCurrencyBarProps> = ({
  tonBalance,
  ncBalance,
  isMiningActive = true,
}) => {
  return (
    <div className="grid grid-cols-2 gap-3 w-full max-w-md mx-auto my-2">
      {/* TON Balance Card */}
      <div className="glass-panel p-3 rounded-2xl relative overflow-hidden group border border-cyber-border hover:border-cyber-cyan/50 transition-all">
        <div className="absolute top-0 right-0 w-16 h-16 bg-cyber-cyan/10 rounded-full blur-xl pointer-events-none" />
        <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
          <div className="w-5 h-5 rounded-full bg-cyber-cyan/20 flex items-center justify-center text-cyber-cyan">
            💎
          </div>
          <span className="font-medium tracking-wide uppercase">TON Coin</span>
          {isMiningActive && (
            <span className="flex h-2 w-2 relative ml-auto">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-cyan opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyber-cyan"></span>
            </span>
          )}
        </div>
        <div className="text-lg font-bold font-mono text-cyber-cyan tracking-tight truncate">
          {tonBalance}
          <span className="text-xs text-cyber-cyan/70 ml-1">TON</span>
        </div>
      </div>

      {/* NC Coin Fuel Card */}
      <div className="glass-panel p-3 rounded-2xl relative overflow-hidden group border border-cyber-border hover:border-cyber-gold/50 transition-all">
        <div className="absolute top-0 right-0 w-16 h-16 bg-cyber-gold/10 rounded-full blur-xl pointer-events-none" />
        <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
          <div className="w-5 h-5 rounded-full bg-cyber-gold/20 flex items-center justify-center text-cyber-gold">
            <Coins size={12} className="text-cyber-gold" />
          </div>
          <span className="font-medium tracking-wide uppercase">NC Fuel</span>
        </div>
        <div className="text-lg font-bold font-mono text-cyber-gold tracking-tight truncate">
          {Number(ncBalance).toLocaleString()}
          <span className="text-xs text-cyber-gold/70 ml-1">NC</span>
        </div>
      </div>
    </div>
  );
};
