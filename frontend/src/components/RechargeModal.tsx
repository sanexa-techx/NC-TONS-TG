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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-sm rounded-3xl p-5 border border-[#E2E8F0] shadow-2xl relative">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
        >
          <X size={20} />
        </button>

        <div className="flex items-center space-x-2 text-[#2563EB] mb-2">
          <BatteryCharging size={22} />
          <h3 className="text-base font-extrabold text-slate-900">Recharge Power Grid</h3>
        </div>

        <p className="text-xs text-slate-500 mb-4">
          Mining requires active battery power (8-hour capacity). Choose a recharge method below:
        </p>

        {message && (
          <div
            className={`p-3 rounded-xl text-xs mb-4 flex items-center space-x-2 ${
              message.type === 'success'
                ? 'bg-emerald-50 text-[#059669] border border-emerald-200'
                : 'bg-red-50 text-[#DC2626] border border-red-200'
            }`}
          >
            {message.type === 'success' && <CheckCircle2 size={16} />}
            <span>{message.text}</span>
          </div>
        )}

        {adProgress !== null ? (
          <div className="py-6 flex flex-col items-center justify-center">
            <Tv size={36} className="text-[#2563EB] animate-pulse mb-2.5" />
            <span className="text-xs font-bold text-slate-800 mb-2">Watching Sponsored Video...</span>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
              <div
                className="bg-[#2563EB] h-2.5 rounded-full transition-all duration-300"
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
                  ? 'bg-[#ECFDF5] hover:bg-emerald-100/70 border-emerald-200 shadow-xs'
                  : 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-[#10B981]">
                  <NcIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900 flex items-center space-x-1">
                    <span>Spend 500 NC Coins</span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
                    <span>Balance: {currentNc.toLocaleString()} NC</span>
                  </div>
                </div>
              </div>
              <div className="text-xs font-bold text-[#10B981] font-mono">
                -500 NC
              </div>
            </button>

            {/* Option 2: Rewarded Video */}
            <button
              onClick={handleAdRecharge}
              disabled={loading}
              className="w-full p-3.5 rounded-2xl border bg-[#EFF6FF] hover:bg-blue-100/70 border-blue-200 transition-all flex items-center justify-between cursor-pointer shadow-xs"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-[#2563EB]">
                  <Tv size={18} />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900">Watch Sponsored Ad</div>
                  <div className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
                    <span>Free full recharge</span>
                    <span>•</span>
                    <span className="text-[#2563EB] font-bold">Fast Boost</span>
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-[#2563EB] font-mono">FREE</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
