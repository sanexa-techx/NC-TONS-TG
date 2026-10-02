import React, { useEffect, useState, useCallback } from "react";
import { ShieldCheck, Lock, Sparkles, Zap } from "lucide-react";
import { TonIcon, NcIcon } from "./icons/index.js";
import { useAdManager } from "../hooks/useAdManager.js";
import { api } from "../services/api.js";
import { DailyAdStatusResponse } from "../types/index.js";

interface AdMissionsSectionProps {
  userId: number | string;
  onRewardClaimed?: () => void;
}

export const AdMissionsSection: React.FC<AdMissionsSectionProps> = ({
  userId,
  onRewardClaimed,
}) => {
  const [adStatus, setAdStatus] = useState<DailyAdStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [adCooldown, setAdCooldown] = useState<number>(0);

  useEffect(() => {
    if (adCooldown <= 0) return;
    const timer = setInterval(() => {
      setAdCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [adCooldown]);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await api.getAdStatus(userId);
      setAdStatus(data);
    } catch (e) {
      console.warn("Could not fetch ad status:", e);
    }
  }, [userId]);

  const { showMonetagRewarded, showWithdrawalLimitAd } = useAdManager(
    userId,
    () => {
      fetchStatus();
      setAdCooldown(10);
      if (onRewardClaimed) onRewardClaimed();
    }
  );

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  if (!adStatus) return null;

  const handleWatchMonetag = async () => {
    if (adCooldown > 0 || loading) return;
    setLoading(true);
    await showMonetagRewarded();
    setAdCooldown(10);
    setLoading(false);
  };

  const handleWatchLimitAd = async () => {
    if (adCooldown > 0 || loading) return;
    setLoading(true);
    await showWithdrawalLimitAd();
    setAdCooldown(10);
    setLoading(false);
  };

  const monetagMax = adStatus.monetag.max || 200;
  const monetagWatched = adStatus.monetag.watched || 0;
  const monetagRequired = adStatus.monetag.requiredForWithdraw || 4;
  const isMaxed = monetagWatched >= monetagMax;

  return (
    <div className="w-full space-y-2.5">
      {/* Daily Withdrawal Requirement Badge */}
      <div
        className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs transition-all shadow-sm ${
          adStatus.canWithdraw
            ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300 shadow-glow-green/10"
            : "bg-amber-950/30 border-amber-500/40 text-amber-300 shadow-glow-gold/10"
        }`}
      >
        <div className="flex items-center gap-2.5">
          {adStatus.canWithdraw ? (
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <Lock className="w-5 h-5 text-amber-400 shrink-0" />
          )}
          <div>
            <h5 className="font-bold flex items-center gap-1.5">
              <span>Daily Withdrawal Gate</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 border border-current">
                UTC Reset
              </span>
            </h5>
            <p className="text-[10.5px] opacity-90 mt-0.5">
              Monetag: <span className="font-bold font-mono">{monetagWatched}/{monetagRequired}</span> ads required to unlock daily payouts
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="font-mono font-bold text-[11px] block">
            {adStatus.canWithdraw ? "UNLOCKED ✅" : "LOCKED 🔒"}
          </span>
          <span className="text-[9px] text-slate-400 block font-mono">
            {adStatus.canWithdraw ? "Ready to Payout" : "Watch to Unlock"}
          </span>
        </div>
      </div>

      {/* 1. Monetag Mission Card (Sole/Main Ad Provider - 200 Daily Cap) */}
      <div className="bg-neutral-900/90 border border-neutral-800 hover:border-blue-500/30 rounded-2xl p-3.5 flex items-center justify-between text-white transition-all">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-1.5">
              <h4 className="font-bold text-xs">Watch Monetag Ad</h4>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Main Provider
              </span>
            </div>
            <span className="text-[10px] font-mono text-neutral-400">
              ({monetagWatched}/{monetagMax})
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono pl-7.5">
            <span className="text-yellow-400 font-bold flex items-center gap-1">
              <NcIcon className="w-3.5 h-3.5" /> +200 NC
            </span>
            <span className="text-blue-400 font-bold flex items-center gap-1">
              <TonIcon className="w-3.5 h-3.5" /> +0.00020 TON
            </span>
          </div>
        </div>

        <button
          onClick={handleWatchMonetag}
          disabled={isMaxed || loading || adCooldown > 0}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-bold text-xs rounded-xl transition shadow-md shadow-blue-500/10 active:scale-95 min-w-[85px] text-center"
        >
          {isMaxed
            ? "Maxed"
            : adCooldown > 0
            ? `Wait (${adCooldown}s)`
            : "Watch"}
        </button>
      </div>

      {/* 2. Withdrawal Limit Pass Mission (30 daily / 100 weekly) */}
      <div className="bg-neutral-900/90 border border-neutral-800 hover:border-cyan-500/30 rounded-2xl p-3.5 flex items-center justify-between text-white transition-all">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-1.5">
              <h4 className="font-bold text-xs">Withdrawal Limit Pass</h4>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                1/day • 5/week
              </span>
            </div>
            {adStatus.withdrawalLimits && (
              <span className="text-[10px] font-mono text-neutral-400">
                (Daily: {adStatus.withdrawalLimits.daily.adsWatched}/30 • Weekly: {adStatus.withdrawalLimits.weekly.adsWatched}/100)
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs font-mono pl-7.5">
            <span className="text-yellow-400 font-bold flex items-center gap-1">
              <NcIcon className="w-3.5 h-3.5" /> +200 NC
            </span>
            <span className="text-cyan-400 font-bold flex items-center gap-1">
              <TonIcon className="w-3.5 h-3.5" /> +0.00025 TON
            </span>
          </div>
          <p className="text-[9.5px] text-amber-400/90 font-mono pl-7.5">
            * Independent views - does not count towards the 4 Monetag gate
          </p>
        </div>

        <button
          onClick={handleWatchLimitAd}
          disabled={loading || adCooldown > 0}
          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-neutral-800 disabled:text-neutral-500 text-black font-bold text-xs rounded-xl transition shadow-md shadow-cyan-500/10 active:scale-95 min-w-[85px] text-center shrink-0"
        >
          {adCooldown > 0 ? `Wait (${adCooldown}s)` : "Watch"}
        </button>
      </div>
    </div>
  );
};

export default AdMissionsSection;
