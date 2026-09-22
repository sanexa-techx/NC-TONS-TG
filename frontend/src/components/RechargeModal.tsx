import React, { useState } from 'react';
import { X, BatteryCharging, Tv, CheckCircle2 } from 'lucide-react';
import { NcIcon, TonIcon } from './icons/index.js';

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  ncBalance: string | number;
  onRecharge: (method: 'nc' | 'ad') => Promise<any>;
}

export const RechargeModal: React.FC<RechargeModalProps> = ({
  isOpen,
  onClose,
  ncBalance,
  onRecharge,
}) => {
  const [loading, setLoading] = useState(false);
  const [adProgress, setAdProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const currentNc = Number(ncBalance);
  const hasEnoughNc = currentNc >= 500;

  const handleNcRecharge = async () => {
    if (!hasEnoughNc) return;
    setLoading(true);
    setMessage(null);
    try {
      await onRecharge('nc');
      setMessage({ type: 'success', text: 'Power grid fully recharged to 100%!' });
      setTimeout(() => {
        onClose();
        setMessage(null);
      }, 1200);
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const handleAdRecharge = async () => {
    setLoading(true);
    setMessage(null);
    setAdProgress(0);

    // Simulate 4-second rewarded ad
    const interval = setInterval(() => {
      setAdProgress((prev) => {
        if (prev === null || prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 25;
      });
    }, 800);

    setTimeout(async () => {
      try {
        await onRecharge('ad');
        setAdProgress(null);
        setMessage({ type: 'success', text: 'Rewarded Ad completed! Battery recharged to 100%!' });
        setTimeout(() => {
          onClose();
          setMessage(null);
        }, 1200);
      } catch (err) {
        setAdProgress(null);
        setMessage({ type: 'error', text: (err as Error).message });
      } finally {
        setLoading(false);
      }
    }, 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="glass-panel w-full max-w-sm rounded-3xl p-5 border border-cyber-cyan/30 shadow-glow-cyan relative">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
        >
          <X size={20} />
        </button>

        <div className="flex items-center space-x-2 text-cyber-cyan mb-3">
          <BatteryCharging size={24} />
          <h3 className="text-lg font-bold">Recharge Power Grid</h3>
        </div>

        <p className="text-xs text-slate-300 mb-4">
          Mining requires active battery power (8-hour capacity). Choose a recharge method below:
        </p>

        {message && (
          <div
            className={`p-3 rounded-xl text-xs mb-4 flex items-center space-x-2 ${
              message.type === 'success'
                ? 'bg-cyber-green/20 text-cyber-green border border-cyber-green/40'
                : 'bg-cyber-red/20 text-cyber-red border border-cyber-red/40'
            }`}
          >
            {message.type === 'success' && <CheckCircle2 size={16} />}
            <span>{message.text}</span>
          </div>
        )}

        {adProgress !== null ? (
          <div className="py-6 flex flex-col items-center justify-center">
            <Tv size={40} className="text-cyber-cyan animate-pulse mb-3" />
            <span className="text-sm font-bold text-white mb-2">Watching Sponsored Video...</span>
            <div className="w-full bg-cyber-bg rounded-full h-2.5 overflow-hidden border border-cyber-border">
              <div
                className="bg-cyber-cyan h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${adProgress}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-400 mt-2">Reward unlocks upon ad completion</span>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Option 1: NC Coins */}
            <button
              onClick={handleNcRecharge}
              disabled={!hasEnoughNc || loading}
              className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                hasEnoughNc
                  ? 'bg-cyber-surface hover:bg-cyber-card border-cyber-gold/40 hover:border-cyber-gold shadow-glow-gold/20'
                  : 'bg-cyber-surface/40 border-cyber-border opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-cyber-gold/20 flex items-center justify-center text-cyber-gold">
                  <NcIcon className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-sm text-white flex items-center space-x-1.5">
                    <NcIcon className="w-4 h-4" />
                    <span>Spend 500 NC Coins</span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                    <span>Balance: {currentNc.toLocaleString()}</span>
                    <NcIcon className="w-3 h-3 inline" />
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-1 text-xs font-bold text-cyber-gold font-mono">
                <NcIcon className="w-3.5 h-3.5" />
                <span>-500</span>
              </div>
            </button>

            {/* Option 2: Rewarded Video */}
            <button
              onClick={handleAdRecharge}
              disabled={loading}
              className="w-full p-4 rounded-2xl border bg-cyber-surface hover:bg-cyber-card border-cyber-cyan/40 hover:border-cyber-cyan transition-all flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-cyber-cyan/20 flex items-center justify-center text-cyber-cyan">
                  <Tv size={20} />
                </div>
                <div>
                  <div className="font-bold text-sm text-white">Watch Video Ad (Adsgram)</div>
                  <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 mt-0.5">
                    <span>Free full recharge</span>
                    <span>•</span>
                    <span className="flex items-center space-x-1 text-cyber-cyan">
                      <TonIcon className="w-3 h-3" />
                      <NcIcon className="w-3 h-3" />
                      <span>Boost</span>
                    </span>
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-cyber-green font-mono">FREE</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
