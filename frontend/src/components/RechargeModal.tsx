import React, { useState } from 'react';
import { X, BatteryCharging, Tv, CheckCircle2 } from 'lucide-react';
import { NcIcon } from './icons/index.js';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900/95 backdrop-blur-2xl w-full max-w-sm rounded-3xl p-5 border border-white/15 shadow-2xl relative text-slate-100">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 cursor-pointer transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center space-x-2 text-blue-400 mb-2">
          <BatteryCharging size={22} />
          <h3 className="text-base font-extrabold text-white">Recharge Power Grid</h3>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          Mining requires active battery power (8-hour capacity). Choose a recharge method below:
        </p>

        {message && (
          <div
            className={`p-3 rounded-xl text-xs mb-4 flex items-center space-x-2 ${
              message.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                : 'bg-red-500/10 text-red-300 border border-red-500/30'
            }`}
          >
            {message.type === 'success' && <CheckCircle2 size={16} />}
            <span>{message.text}</span>
          </div>
        )}

        {adProgress !== null ? (
          <div className="py-6 flex flex-col items-center justify-center">
            <Tv size={36} className="text-blue-400 animate-pulse mb-2.5" />
            <span className="text-xs font-bold text-white mb-2">Watching Sponsored Video...</span>
            <div className="w-full bg-slate-950/70 rounded-full h-2.5 overflow-hidden border border-white/10">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(37,99,235,0.6)]"
                style={{ width: `${adProgress}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-2">Reward unlocks upon ad completion</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* Option 1: NC Coins */}
            <button
              onClick={handleNcRecharge}
              disabled={!hasEnoughNc || loading}
              className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                hasEnoughNc
                  ? 'bg-slate-950/70 hover:bg-slate-800/80 border-white/10 shadow-lg'
                  : 'bg-slate-950/40 border-white/5 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
                  <NcIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs text-white flex items-center space-x-1">
                    <span>Spend 500 NC Coins</span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
                    <span>Balance: {currentNc.toLocaleString()} NC</span>
                  </div>
                </div>
              </div>
              <div className="text-xs font-bold text-emerald-400 font-mono">
                -500 NC
              </div>
            </button>

            {/* Option 2: Rewarded Video */}
            <button
              onClick={handleAdRecharge}
              disabled={loading}
              className="w-full p-3.5 rounded-2xl border bg-slate-950/70 hover:bg-slate-800/80 border-white/10 transition-all flex items-center justify-between cursor-pointer shadow-lg"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-300">
                  <Tv size={18} />
                </div>
                <div>
                  <div className="font-bold text-xs text-white">Watch Sponsored Ad</div>
                  <div className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
                    <span>Free full recharge</span>
                    <span>•</span>
                    <span className="text-blue-400 font-bold">Fast Boost</span>
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-blue-400 font-mono">FREE</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
