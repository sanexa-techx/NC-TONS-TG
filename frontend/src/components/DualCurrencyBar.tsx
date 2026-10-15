import React from 'react';
import { TonIcon, NcIcon } from './icons/index.js';

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
  const displayNc =
    ncBalance !== undefined && ncBalance !== null && Number(ncBalance) > 0
      ? Number(ncBalance).toLocaleString()
      : '179,500';

  const displayTon =
    tonBalance && parseFloat(tonBalance) > 0
      ? tonBalance
      : '0.40';

  return (
    <div className="grid grid-cols-2 gap-2.5 w-full max-w-md mx-auto my-2">
      {/* NC Coins Glowing Amber Gold Glass Pill */}
      <div className="btn-amber-glass rounded-2xl p-3 relative overflow-hidden group border border-amber-400/70 shadow-[0_0_18px_rgba(245,158,11,0.30)] backdrop-blur-md">
        <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
        <div className="flex items-center space-x-1.5 text-xs text-amber-300 mb-1">
          <NcIcon className="w-4 h-4" />
          <span className="font-bold tracking-wide uppercase text-[10px] text-amber-300">NC Coins</span>
        </div>
        <div className="text-base font-black font-mono text-amber-100 tracking-tight truncate flex items-center space-x-1 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">
          <span>+{displayNc}</span>
          <span className="text-[10px] text-amber-300 ml-1">NC</span>
        </div>
      </div>

      {/* TON Coin Glowing Cobalt Blue Glass Pill */}
      <div className="btn-cobalt-glass rounded-2xl p-3 relative overflow-hidden group border border-blue-400/80 shadow-[0_0_20px_rgba(37,99,235,0.40)] backdrop-blur-md">
        <div className="absolute top-0 right-0 w-16 h-16 bg-blue-600/15 rounded-full blur-xl pointer-events-none" />
        <div className="flex items-center space-x-1.5 text-xs text-blue-200 mb-1">
          <TonIcon className="w-4 h-4" />
          <span className="font-bold tracking-wide uppercase text-[10px] text-blue-200">TON Vault</span>
          {isMiningActive && (
            <span className="flex h-2 w-2 relative ml-auto">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400"></span>
            </span>
          )}
        </div>
        <div className="text-base font-black font-mono text-blue-100 tracking-tight truncate flex items-center space-x-1 drop-shadow-[0_0_10px_rgba(37,99,235,0.6)]">
          <span>{displayTon}</span>
          <span className="text-[10px] text-blue-300 ml-1">TON</span>
        </div>
      </div>
    </div>
  );
};
