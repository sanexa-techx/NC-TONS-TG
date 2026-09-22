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
        className={`group relative flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-cyber-surface/90 border border-cyber-green/40 hover:border-cyber-green shadow-sm shadow-cyber-green/10 backdrop-blur-md transition-all duration-300 active:scale-95 cursor-pointer ${
          isPulsing ? 'scale-105 border-cyber-green shadow-cyber-green/30' : ''
        } ${className}`}
      >
        {/* Animated Pulsing Radar Dot */}
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-green opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyber-green shadow-[0_0_8px_#00ff88]"></span>
        </span>

        {/* Players Count */}
        <span
          className={`font-mono text-xs font-bold tracking-tight transition-colors duration-200 ${
            isPulsing ? 'text-cyber-green' : 'text-white'
          }`}
        >
          {onlineCount.toLocaleString()}
        </span>

        {/* Online Label */}
        <span className="text-[10px] font-mono text-cyber-green uppercase tracking-wider font-semibold group-hover:underline">
          online
        </span>
      </button>

      {/* Network Telemetry Popover Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-xs glass-panel p-4 rounded-2xl border border-cyber-cyan/40 shadow-2xl relative overflow-hidden animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient Background Glow */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-cyber-green/15 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-cyber-cyan/15 rounded-full blur-2xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-cyber-border">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-cyber-green/20 flex items-center justify-center text-cyber-green border border-cyber-green/30">
                  <Activity size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
                    Network Telemetry
                  </h4>
                  <p className="text-[10px] text-cyber-green font-mono flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyber-green inline-block animate-pulse" />
                    <span>CLUSTER OPERATIONAL</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-cyber-card transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Live Metrics Grid */}
            <div className="space-y-2.5 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-cyber-bg/80 border border-cyber-border flex items-center justify-between">
                <div className="flex items-center space-x-2 text-slate-400">
                  <Users size={14} className="text-cyber-green" />
                  <span className="text-[11px]">Real Active Miners:</span>
                </div>
                <div className="text-sm font-bold text-white flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-cyber-green animate-pulse" />
                  <span>{onlineCount.toLocaleString()}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-cyber-bg/80 border border-cyber-border flex items-center justify-between">
                <div className="flex items-center space-x-2 text-slate-400">
                  <Radio size={14} className="text-cyber-cyan" />
                  <span className="text-[11px]">24h Peak Real Users:</span>
                </div>
                <div className="font-bold text-cyber-cyan">
                  {peak24h.toLocaleString()} {peak24h === 1 ? 'miner' : 'miners'}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-cyber-bg/80 border border-cyber-border flex items-center justify-between">
                <div className="flex items-center space-x-2 text-slate-400">
                  <Globe2 size={14} className="text-cyber-gold" />
                  <span className="text-[11px]">Connected Cluster:</span>
                </div>
                <div className="font-bold text-white text-[11px]">
                  Direct WebSocket / HTTP2
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-cyber-bg/80 border border-cyber-border flex items-center justify-between">
                <div className="flex items-center space-x-2 text-slate-400">
                  <Zap size={14} className="text-cyber-gold" />
                  <span className="text-[11px]">Presence Heartbeat:</span>
                </div>
                <div className="text-cyber-green font-bold text-[11px]">
                  Active &bull; 8s Ping
                </div>
              </div>

              <div className="p-2 rounded-xl bg-cyber-card/50 border border-cyber-border/60 flex items-center justify-between text-[10px] text-slate-400">
                <div className="flex items-center space-x-1.5">
                  <ShieldCheck size={12} className="text-cyber-cyan" />
                  <span>Verified Peers:</span>
                </div>
                <span className="font-bold text-cyber-green">{activeRealUsers} Active</span>
              </div>
            </div>

            {/* Close action */}
            <button
              onClick={() => setShowModal(false)}
              className="mt-3 w-full py-2 rounded-xl bg-cyber-card hover:bg-cyber-surface border border-cyber-border text-slate-300 hover:text-white text-xs font-mono font-bold transition-all"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </>
  );
};
