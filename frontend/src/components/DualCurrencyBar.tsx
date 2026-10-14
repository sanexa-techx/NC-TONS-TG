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
      {/* NC Fuel Card */}
      <div className="bg-white p-3 rounded-2xl relative overflow-hidden group border border-[#E2E8F0] shadow-sm hover:border-emerald-300 transition-all">
        <div className="absolute top-0 right-0 w-16 h-16 bg-[#10B981]/10 rounded-full blur-xl pointer-events-none" />
        <div className="flex items-center space-x-1.5 text-xs text-slate-400 mb-1">
          <NcIcon className="w-4 h-4 shadow-xs" />
          <span className="font-bold tracking-wide uppercase text-[10px] text-emerald-600">NC Coins</span>
        </div>
        <div className="text-base font-extrabold font-mono text-[#10B981] tracking-tight truncate flex items-center space-x-1">
          <span>{displayNc}</span>
          <span className="text-[10px] text-emerald-600/70 ml-1">NC</span>
        </div>
      </div>

      {/* TON Balance Card */}
      <div className="bg-white p-3 rounded-2xl relative overflow-hidden group border border-[#E2E8F0] shadow-sm hover:border-blue-300 transition-all">
        <div className="absolute top-0 right-0 w-16 h-16 bg-[#2563EB]/10 rounded-full blur-xl pointer-events-none" />
        <div className="flex items-center space-x-1.5 text-xs text-slate-400 mb-1">
          <TonIcon className="w-4 h-4 shadow-xs" />
          <span className="font-bold tracking-wide uppercase text-[10px] text-[#2563EB]">TON Coin</span>
          {isMiningActive && (
            <span className="flex h-2 w-2 relative ml-auto">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2563EB] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2563EB]"></span>
            </span>
          )}
        </div>
        <div className="text-base font-extrabold font-mono text-[#2563EB] tracking-tight truncate flex items-center space-x-1">
          <span>{displayTon}</span>
          <span className="text-[10px] text-[#2563EB]/70 ml-1">TON</span>
        </div>
      </div>
    </div>
  );
};
