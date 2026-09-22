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
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
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
    <div className="flex flex-col items-center justify-center my-6 relative">
      {/* Outer ambient glow */}
      <div
        className={`absolute w-64 h-64 rounded-full blur-3xl opacity-30 transition-all duration-700 pointer-events-none ${
          isDead ? 'bg-cyber-red animate-pulse' : 'bg-cyber-cyan'
        }`}
      />

      {/* SVG Ring Container */}
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#1a2336"
            strokeWidth={strokeWidth}
            fill="transparent"
          />

          {/* Animated Gauge Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={isDead ? '#ff0055' : '#00f0ff'}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-500 ease-out"
            style={{
              filter: isDead
                ? 'drop-shadow(0 0 10px rgba(255, 0, 85, 0.8))'
                : 'drop-shadow(0 0 12px rgba(0, 240, 255, 0.7))',
            }}
          />
        </svg>

        {/* Center Content */}
        <div className="absolute flex flex-col items-center justify-center text-center px-4">
          {isDead ? (
            <div className="flex flex-col items-center animate-bounce">
              <AlertTriangle size={36} className="text-cyber-red mb-1 drop-shadow-glow-red" />
              <span className="text-xs font-bold text-cyber-red tracking-wider uppercase">
                Battery Exhausted
              </span>
              <span className="text-2xl font-black font-mono text-white mt-1">0%</span>
              <span className="text-[11px] text-slate-400 mt-1">Mining Halted</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="flex items-center space-x-1 text-cyber-cyan mb-1">
                <Zap size={20} className="animate-pulse" />
                <span className="text-xs font-semibold uppercase tracking-wider">Rig Active</span>
              </div>
              <div className="text-4xl font-black font-mono tracking-tight text-white drop-shadow">
                {powerPercentage}%
              </div>
              <div className="text-xs font-mono text-slate-400 mt-1 flex items-center space-x-1">
                <Battery size={14} className="text-cyber-cyan" />
                <span>{formattedTime} Left</span>
              </div>
              <div className="text-[11px] text-cyber-cyan/80 font-mono mt-1">
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
          className={`w-full py-3.5 px-6 rounded-2xl font-bold flex items-center justify-center space-x-2 transition-all transform active:scale-95 shadow-lg ${
            isDead
              ? 'bg-gradient-to-r from-cyber-red to-pink-600 hover:from-cyber-red/90 text-white shadow-glow-red animate-pulse'
              : 'bg-gradient-to-r from-cyber-cyan to-cyber-blue hover:opacity-90 text-cyber-bg font-extrabold shadow-glow-cyan'
          }`}
        >
          <BatteryCharging size={20} />
          <span>{isDead ? 'EMERGENCY RECHARGE' : 'RECHARGE POWER GRID'}</span>
        </button>
      </div>
    </div>
  );
};
