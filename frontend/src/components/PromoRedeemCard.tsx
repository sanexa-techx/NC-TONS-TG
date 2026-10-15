import React, { useState } from 'react';
import { api } from '../services/api.js';
import { Ticket, Sparkles, AlertCircle, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { TonIcon, NcIcon } from './icons/index.js';

interface PromoRedeemCardProps {
  onRedeemSuccess?: (reward: { nc: number; ton: string }) => void;
  className?: string;
}

export const PromoRedeemCard: React.FC<PromoRedeemCardProps> = ({
  onRedeemSuccess,
  className = '',
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successReward, setSuccessReward] = useState<{
    code: string;
    nc: number;
    ton: string;
  } | null>(null);

  const triggerHaptic = (type: 'success' | 'error') => {
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.HapticFeedback?.notificationOccurred) {
        tg.HapticFeedback.notificationOccurred(type);
      }
    } catch {
      // Haptics unavailable in browser dev mode
    }
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.redeemPromo(cleanCode);
      triggerHaptic('success');
      setSuccessReward({
        code: cleanCode,
        nc: res.reward.nc,
        ton: res.reward.ton,
      });
      setCode('');
      if (onRedeemSuccess) {
        onRedeemSuccess(res.reward);
      }
    } catch (err: any) {
      triggerHaptic('error');
      setError(err.message || 'Failed to redeem promo code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`w-full obsidian-card p-4 rounded-2xl border border-white/10 shadow-2xl shadow-black/70 relative overflow-hidden ${className}`}
    >
      {/* Background subtle ambient tint */}
      <div className="absolute -top-12 -right-12 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-28 h-28 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-300 border border-blue-400/30">
            <Ticket size={16} />
          </div>
          <div>
            <h3 className="text-xs font-black font-mono uppercase text-white tracking-wide flex items-center gap-1.5">
              <span>Redeem Promo Code</span>
              <Sparkles size={12} className="text-emerald-400 animate-pulse" />
            </h3>
            <p className="text-[10px] text-slate-400">Claim exclusive dual-currency airdrop drops</p>
          </div>
        </div>

        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full btn-smoked-glass text-slate-300">
          Instant Credit
        </span>
      </div>

      {/* Feedback Alerts */}
      {error && (
        <div className="mb-3 p-2.5 rounded-xl card-crimson-glass text-xs flex items-center space-x-2 animate-fadeIn relative z-10">
          <AlertCircle size={15} className="shrink-0 text-red-400" />
          <span className="leading-tight font-medium text-red-200">{error}</span>
        </div>
      )}

      {successReward && (
        <div className="mb-3 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 animate-fadeIn relative z-10 shadow-[0_0_14px_rgba(16,185,129,0.25)]">
          <div className="flex items-center space-x-2 text-emerald-300 text-xs font-bold font-mono mb-2">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>PROMO CODE &quot;{successReward.code}&quot; REDEEMED!</span>
          </div>

          <div className="flex items-center gap-3">
            {/* NC Reward Badge */}
            <div className="flex items-center space-x-1.5 btn-amber-glass px-2.5 py-1 rounded-lg">
              <NcIcon className="w-4 h-4" />
              <span className="text-xs font-bold font-mono text-amber-200">
                +{successReward.nc.toLocaleString()} NC
              </span>
            </div>

            {/* TON Reward Badge */}
            <div className="flex items-center space-x-1.5 btn-cobalt-glass px-2.5 py-1 rounded-lg">
              <TonIcon className="w-4 h-4" />
              <span className="text-xs font-bold font-mono text-blue-200">
                +{successReward.ton} TON
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleRedeem} className="space-y-2 relative z-10">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ENTER CODE"
              maxLength={32}
              disabled={loading}
              className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-mono uppercase tracking-widest placeholder:text-slate-500 placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:border-blue-400 transition-all disabled:opacity-50"
            />
            {code && (
              <button
                type="button"
                onClick={() => setCode('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="px-4 py-2.5 rounded-xl btn-cobalt-glass font-black text-xs uppercase tracking-wider shadow-sm active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center space-x-1 shrink-0 cursor-pointer"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin text-white" />
            ) : (
              <>
                <span>Claim</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
        <p className="text-[9px] text-slate-400 font-mono pl-1">
          Single redemption per miner. Rewards are credited instantly to your balance.
        </p>
      </form>
    </div>
  );
};
