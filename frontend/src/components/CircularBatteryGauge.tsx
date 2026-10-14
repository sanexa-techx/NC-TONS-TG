import React from 'react';
import { Zap, AlertTriangle, Battery, BatteryCharging } from 'lucide-react';

interface CircularBatteryGaugeProps {
  powerPercentage: number;
  powerCapacityHours: number;
  hashratePerSec: string;
  onRechargeClick: () => void;
}

export const CircularBatteryGauge: React.FC<CircularBatteryGaugeProps> = ({
  powerPercentage,
  powerCapacityHours,
  hashratePerSec,
  onRechargeClick,
}) => {
  const isDead = powerPercentage <= 0;
  const size = 260;
  const svgSize = size - 30;
  const strokeWidth = 14;
  const radius = (svgSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, powerPercentage));
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Calculate remaining time
  const totalSeconds = (powerCapacityHours * 3600 * progress) / 100;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const formattedTime = isDead
    ? '00:00:00'
    : `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="flex flex-col items-center justify-center my-4 relative">
      {/* Outer ambient glow */}
      <div
        className={`absolute w-60 h-60 rounded-full blur-3xl opacity-20 transition-all duration-700 pointer-events-none ${
          isDead ? 'bg-[#DC2626]' : 'bg-[#10B981]'
        }`}
      />

      {/* SVG Ring Container */}
      <div className="relative flex items-center justify-center bg-white rounded-full p-4 border border-[#E2E8F0] shadow-sm" style={{ width: size, height: size }}>
        <svg width={svgSize} height={svgSize} className="transform -rotate-90">
          {/* Background Track */}
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
            fill="transparent"
          />

          {/* Animated Gauge Arc */}
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            stroke={isDead ? '#DC2626' : '#10B981'}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-500 ease-out"
          />
        </svg>

        {/* Center Content */}
        <div className="absolute flex flex-col items-center justify-center text-center px-4">
          {isDead ? (
            <div className="flex flex-col items-center animate-bounce">
              <AlertTriangle size={32} className="text-[#DC2626] mb-1" />
              <span className="text-[11px] font-bold text-[#DC2626] tracking-wider uppercase">
                Battery Exhausted
              </span>
              <span className="text-2xl font-black font-mono text-slate-900 mt-0.5">0%</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Mining Halted</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="flex items-center space-x-1 text-[#10B981] mb-0.5">
                <Zap size={16} className="fill-[#10B981]" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider">Rig Active</span>
              </div>
              <div className="text-3xl font-black font-mono tracking-tight text-slate-900">
                {powerPercentage}%
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-0.5 flex items-center space-x-1">
                <Battery size={13} className="text-[#10B981]" />
                <span>{formattedTime} Left</span>
              </div>
              <div className="text-[10px] text-[#2563EB] font-mono mt-0.5 font-bold">
                {hashratePerSec} TON/s
              </div>
            </div>
          )}
        </div>
      </div>

      {/* One-Tap Recharge Button */}
      <div className="mt-4 w-full max-w-xs">
        <button
          onClick={onRechargeClick}
          className={`w-full py-3 px-5 rounded-2xl font-extrabold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all transform active:scale-95 shadow-md cursor-pointer ${
            isDead
              ? 'bg-[#DC2626] hover:bg-red-700 text-white shadow-red-500/20 animate-pulse'
              : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-blue-600/25'
          }`}
        >
          <BatteryCharging size={18} />
          <span>{isDead ? 'EMERGENCY RECHARGE' : 'RECHARGE POWER GRID'}</span>
        </button>
      </div>
    </div>
  );
};
