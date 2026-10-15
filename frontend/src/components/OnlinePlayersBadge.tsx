import React, { useState } from 'react';
import { useOnlinePlayers } from '../hooks/useOnlinePlayers.js';
import { Users, Activity, Radio, X, Globe2, Zap, ShieldCheck } from 'lucide-react';

interface OnlinePlayersBadgeProps {
  userId?: string;
  className?: string;
}

export const OnlinePlayersBadge: React.FC<OnlinePlayersBadgeProps> = ({
  userId,
  className = '',
}) => {
  const { onlineCount, peak24h, activeRealUsers, isPulsing } = useOnlinePlayers(userId);
  const [showModal, setShowModal] = useState<boolean>(false);

  return (
    <>
      {/* Corner Live Players Badge */}
      <button
        type="button"
        onClick={() => setShowModal(true)}
        title="Live Online Miners • Click for network telemetry"
        className={`group relative flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-emerald-500/40 hover:border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)] backdrop-blur-md transition-all duration-300 active:scale-95 cursor-pointer ${
          isPulsing ? 'scale-105 border-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.45)]' : ''
        } ${className}`}
      >
        {/* Animated Pulsing Radar Dot */}
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"></span>
        </span>

        {/* Players Count */}
        <span className="font-mono text-xs font-black tracking-tight text-white">
          {onlineCount.toLocaleString()}
        </span>

        {/* Online Label */}
        <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-bold">
          online
        </span>
      </button>

      {/* Network Telemetry Popover Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-xs obsidian-card p-4 rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden animate-scaleUp text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient Background Glow */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-blue-600/20 rounded-full blur-2xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/40">
                  <Activity size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
                    Network Telemetry
                  </h4>
                  <p className="text-[10px] text-emerald-400 font-mono flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                    <span>CLUSTER OPERATIONAL</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Live Metrics Grid */}
            <div className="space-y-2.5 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-slate-400">
                  <Users size={14} className="text-emerald-400" />
                  <span className="text-[11px]">Real Active Miners:</span>
                </div>
                <div className="text-sm font-bold text-white flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{onlineCount.toLocaleString()}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-slate-400">
                  <Radio size={14} className="text-blue-400" />
                  <span className="text-[11px]">24h Peak Real Users:</span>
                </div>
                <div className="font-bold text-blue-400">
                  {peak24h.toLocaleString()} {peak24h === 1 ? 'miner' : 'miners'}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-slate-400">
                  <Globe2 size={14} className="text-amber-400" />
                  <span className="text-[11px]">Connected Cluster:</span>
                </div>
                <div className="font-bold text-white text-[11px]">
                  Direct WebSocket / HTTP2
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-slate-400">
                  <Zap size={14} className="text-amber-400" />
                  <span className="text-[11px]">Presence Heartbeat:</span>
                </div>
                <div className="text-emerald-400 font-bold text-[11px]">
                  Active &bull; 8s Ping
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-950/50 border border-white/5 flex items-center justify-between text-[10px] text-slate-400">
                <div className="flex items-center space-x-1.5">
                  <ShieldCheck size={12} className="text-blue-400" />
                  <span>Verified Peers:</span>
                </div>
                <span className="font-bold text-emerald-400">{activeRealUsers} Active</span>
              </div>
            </div>

            {/* Close action */}
            <button
              onClick={() => setShowModal(false)}
              className="mt-3 w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-mono font-bold transition-all cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </>
  );
};
