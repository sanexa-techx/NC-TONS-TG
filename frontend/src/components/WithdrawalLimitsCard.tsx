import { useState, useEffect } from "react";
import WebApp from "@twa-dev/sdk";
import { ShieldAlert, Zap, Film, CheckCircle2, Lock } from "lucide-react";
import { showSmartRewardedAd } from "../services/adManager.js";

export interface WithdrawalLimitsCardProps {
  userId: string | number | bigint;
  onLimitUnlocked?: () => void;
}

export default function WithdrawalLimitsCard({ userId, onLimitUnlocked }: WithdrawalLimitsCardProps) {
  const [limits, setLimits] = useState<any>(null);
  const [adLoading, setAdLoading] = useState(false);

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

    try {
      // Execute multi-network waterfall (Monetag -> Gigapub -> Adsgram)
      const adResult = await showSmartRewardedAd(true);
      if (!adResult.success) {
        alert(adResult.reason || "Ad playback unavailable. Please try again.");
        return;
      }

      // Record ad progress toward breaking the limit on backend
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
        alert(data.message || `Limit break ad recorded via ${adResult.provider}!`);
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

  const dailyUsed = limits?.daily?.used ?? 1;
  const dailyAllowed = limits?.daily?.allowed ?? 1;
  const isDailyHit = limits?.daily?.isLimitReached ?? true;
  const dailyBreakWatched = limits?.daily?.breakAdsWatched ?? 12;

  const weeklyUsed = limits?.weekly?.used ?? 2;
  const weeklyAllowed = limits?.weekly?.allowed ?? 5;
  const weeklyLeft = Math.max(0, weeklyAllowed - weeklyUsed);
  const isWeeklyHit = limits?.weekly?.isLimitReached ?? false;
  const weeklyBreakWatched = limits?.weekly?.breakAdsWatched ?? 0;

  return (
    <div className="obsidian-card rounded-2xl p-4 text-slate-200 space-y-3 mb-4 border border-white/10 shadow-2xl shadow-black/70">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-amber-400" /> Withdrawal Quotas
        </h4>
        <span className="text-[10px] font-mono text-slate-400">Resets: Daily &amp; Mon UTC</span>
      </div>

      {/* Quota Indicators */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Daily Quota Box */}
        <div
          className={`p-3 rounded-xl border flex flex-col justify-between backdrop-blur-md ${
            isDailyHit
              ? "card-crimson-glass"
              : "bg-slate-950/70 border-white/10 text-slate-200"
          }`}
        >
          <div className="flex justify-between items-center text-[11px] font-semibold">
            <span>Daily Quota</span>
            {isDailyHit ? (
              <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 text-[9px] font-mono font-bold border border-red-500/40">1/1 HIT</span>
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </div>
          <div className="mt-2 font-mono font-black text-base text-white">
            {dailyUsed} / {dailyAllowed}
          </div>
          <span className="text-[9px] text-slate-400 mt-0.5 font-mono">Base: 1/day</span>
        </div>

        {/* Weekly Quota Box */}
        <div
          className={`p-3 rounded-xl border flex flex-col justify-between backdrop-blur-md ${
            isWeeklyHit
              ? "card-crimson-glass"
              : "bg-slate-950/70 border-white/10 text-slate-200"
          }`}
        >
          <div className="flex justify-between items-center text-[11px] font-semibold">
            <span>Weekly Quota</span>
            {isWeeklyHit ? (
              <Lock className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <span className="px-1.5 py-0.5 rounded btn-cobalt-glass text-[9px] font-mono font-bold">
                {weeklyLeft}/{weeklyAllowed} LEFT
              </span>
            )}
          </div>
          <div className="mt-2 font-mono font-black text-base text-white">
            {weeklyUsed} / {weeklyAllowed}
          </div>
          <span className="text-[9px] text-slate-400 mt-0.5 font-mono">Base: 5/week</span>
        </div>
      </div>

      {/* Red Alert card: Daily Limit Hit! Watch 30 Ads to break */}
      {isDailyHit && (
        <div className="card-crimson-glass rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-black text-red-200 flex items-center gap-1.5 text-[11px]">
              <ShieldAlert className="w-4 h-4 text-red-400" /> Daily Limit Hit! Watch 30 Ads to break ({dailyBreakWatched}/30)
            </span>
            <span className="font-mono text-[10px] text-red-300 font-bold">
              {Math.min(100, Math.round((dailyBreakWatched / 30) * 100))}%
            </span>
          </div>

          <div className="w-full bg-slate-950/80 rounded-full h-1.5 overflow-hidden border border-red-500/30">
            <div
              className="bg-gradient-to-r from-red-600 to-rose-400 h-full transition-all duration-300 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
              style={{ width: `${Math.min(100, (dailyBreakWatched / 30) * 100)}%` }}
            />
          </div>

          <p className="text-[10.5px] text-red-200/90 font-sans">
            Streamed through our <strong>Monetag → Gigapub → Adsgram</strong> rewarded waterfall with 30s CPM protection.
          </p>

          <button
            onClick={() => handleWatchBreakAd("daily")}
            disabled={adLoading}
            className="w-full py-2.5 btn-cobalt-glass text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition active:scale-98 shadow-md cursor-pointer"
          >
            <Film className="w-3.5 h-3.5" />
            {adLoading ? "Contacting Waterfall Engine..." : "Watch Ad to Break Daily Limit (30 Ads)"}
          </button>
        </div>
      )}

      {/* Weekly Limit Breaker Accordion (Visible when weekly limit reached) */}
      {isWeeklyHit && (
        <div className="bg-[#FEF2F2] border border-red-200 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-red-700 flex items-center gap-1">
              <ShieldAlert className="w-4 h-4 text-red-500" /> Weekly Limit Hit!
            </span>
            <span className="font-mono text-[10px] text-red-700">
              {weeklyBreakWatched} / 150 Ads
            </span>
          </div>

          <div className="w-full bg-red-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-red-500 h-full transition-all duration-300"
              style={{ width: `${Math.min(100, (weeklyBreakWatched / 150) * 100)}%` }}
            />
          </div>

          <button
            onClick={() => handleWatchBreakAd("weekly")}
            disabled={adLoading}
            className="w-full py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95 shadow-xs"
          >
            <Film className="w-3.5 h-3.5" />
            {adLoading ? "Loading Ad..." : "Watch Ad to Break Weekly Limit (150 Ads)"}
          </button>
        </div>
      )}
    </div>
  );
}
