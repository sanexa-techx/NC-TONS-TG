import { useState, useEffect } from "react";
import WebApp from "@twa-dev/sdk";
import { ShieldAlert, Zap, Film, CheckCircle2, Lock } from "lucide-react";
import { useAdManager } from "../hooks/useAdManager.js";

export interface WithdrawalLimitsCardProps {
  userId: string | number | bigint;
  onLimitUnlocked?: () => void;
}

export default function WithdrawalLimitsCard({ userId, onLimitUnlocked }: WithdrawalLimitsCardProps) {
  const [limits, setLimits] = useState<any>(null);
  const [adLoading, setAdLoading] = useState(false);
  const { showMonetagRewarded } = useAdManager(userId ? userId.toString() : '');

  const fetchLimits = async () => {
    try {
      const res = await fetch(`/api/withdraw/limits?userId=${userId}`);
      const data = await res.json();
      setLimits(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchLimits();
    }
  }, [userId]);

  const handleWatchBreakAd = async (target: "daily" | "weekly") => {
    setAdLoading(true);

    // Play Monetag rewarded ad (sole/main provider)
    try {
      await showMonetagRewarded();

      // Record ad progress toward breaking the limit
      const res = await fetch("/api/withdraw/break-limit/watch-ad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId.toString(), target }),
      });
      const data = await res.json();

      if (res.ok) {
        if (WebApp?.HapticFeedback) {
          try {
            WebApp.HapticFeedback.notificationOccurred("success");
          } catch (_) {}
        }
        alert(data.message || "Limit break progress recorded!");
        fetchLimits();
        if (onLimitUnlocked) onLimitUnlocked();
      } else {
        alert(data.error || "Could not record limit break ad");
      }
    } catch (e) {
      alert("Ad failed to play. Try again.");
    } finally {
      setAdLoading(false);
    }
  };

  if (!limits) return null;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 text-white space-y-3 mb-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-yellow-400" /> Withdrawal Quotas
        </h4>
        <span className="text-[10px] font-mono text-neutral-500">Resets: Daily & Mon UTC</span>
      </div>

      {/* Quota Indicators */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Daily Quota Box */}
        <div
          className={`p-3 rounded-2xl border flex flex-col justify-between ${
            limits.daily.isLimitReached
              ? "bg-amber-950/20 border-amber-500/40 text-amber-200"
              : "bg-neutral-950 border-neutral-800 text-neutral-300"
          }`}
        >
          <div className="flex justify-between items-center text-[11px]">
            <span>Daily Quota</span>
            {limits.daily.isLimitReached ? (
              <Lock className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </div>
          <div className="mt-2 font-mono font-black text-base">
            {limits.daily.used} / {limits.daily.allowed}
          </div>
          <span className="text-[9px] text-neutral-400 mt-0.5">Base: 1/day</span>
        </div>

        {/* Weekly Quota Box */}
        <div
          className={`p-3 rounded-2xl border flex flex-col justify-between ${
            limits.weekly.isLimitReached
              ? "bg-amber-950/20 border-amber-500/40 text-amber-200"
              : "bg-neutral-950 border-neutral-800 text-neutral-300"
          }`}
        >
          <div className="flex justify-between items-center text-[11px]">
            <span>Weekly Quota</span>
            {limits.weekly.isLimitReached ? (
              <Lock className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </div>
          <div className="mt-2 font-mono font-black text-base">
            {limits.weekly.used} / {limits.weekly.allowed}
          </div>
          <span className="text-[9px] text-neutral-400 mt-0.5">Base: 5/week</span>
        </div>
      </div>

      {/* Daily Limit Breaker Accordion (Visible when daily limit reached) */}
      {limits.daily.isLimitReached && (
        <div className="bg-neutral-950 border border-amber-500/40 rounded-2xl p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-amber-400 flex items-center gap-1">
              <ShieldAlert className="w-4 h-4" /> Daily Limit Hit!
            </span>
            <span className="font-mono text-[10px] text-neutral-400">
              {limits.daily.breakAdsWatched} / 30 Ads
            </span>
          </div>

          <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-amber-400 h-full transition-all duration-300"
              style={{ width: `${Math.min(100, (limits.daily.breakAdsWatched / 30) * 100)}%` }}
            />
          </div>

          <button
            onClick={() => handleWatchBreakAd("daily")}
            disabled={adLoading}
            className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95"
          >
            <Film className="w-3.5 h-3.5" />
            {adLoading ? "Loading Ad..." : "Watch Ad to Break Daily Limit (30 Ads)"}
          </button>
        </div>
      )}

      {/* Weekly Limit Breaker Accordion (Visible when weekly limit reached) */}
      {limits.weekly.isLimitReached && (
        <div className="bg-neutral-950 border border-red-500/40 rounded-2xl p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-red-400 flex items-center gap-1">
              <ShieldAlert className="w-4 h-4" /> Weekly Limit Hit!
            </span>
            <span className="font-mono text-[10px] text-neutral-400">
              {limits.weekly.breakAdsWatched} / 150 Ads
            </span>
          </div>

          <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-red-400 h-full transition-all duration-300"
              style={{ width: `${Math.min(100, (limits.weekly.breakAdsWatched / 150) * 100)}%` }}
            />
          </div>

          <button
            onClick={() => handleWatchBreakAd("weekly")}
            disabled={adLoading}
            className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95"
          >
            <Film className="w-3.5 h-3.5" />
            {adLoading ? "Loading Ad..." : "Watch Ad to Break Weekly Limit (150 Ads)"}
          </button>
        </div>
      )}
    </div>
  );
}
