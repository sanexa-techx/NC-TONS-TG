import React, { useEffect, useState, useCallback } from "react";
import { ShieldCheck, Lock, Sparkles, Zap, Video, Clock, Layers } from "lucide-react";
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

  // Sync cooldown with localStorage and backend
  const [adCooldown, setAdCooldown] = useState<number>(() => {
    const stored = localStorage.getItem("ad_cooldown_expires_at");
    if (stored) {
      const remaining = Math.ceil((Number(stored) - Date.now()) / 1000);
      return Math.max(0, remaining);
    }
    return 0;
  });

  // Countdown timer loop
  useEffect(() => {
    if (adCooldown <= 0) return;
    const timer = setInterval(() => {
      const stored = localStorage.getItem("ad_cooldown_expires_at");
      if (stored) {
        const remaining = Math.ceil((Number(stored) - Date.now()) / 1000);
        if (remaining <= 0) {
          localStorage.removeItem("ad_cooldown_expires_at");
          setAdCooldown(0);
        } else {
          setAdCooldown(remaining);
        }
      } else {
        setAdCooldown((prev) => Math.max(0, prev - 1));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [adCooldown]);

  // Listen to cooldown events triggered across components
  useEffect(() => {
    const handleCooldownStarted = (e: any) => {
      const remaining = e.detail?.remaining || 30;
      setAdCooldown(remaining);
    };
    window.addEventListener("ad_cooldown_started", handleCooldownStarted);
    return () => window.removeEventListener("ad_cooldown_started", handleCooldownStarted);
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await api.getAdStatus(userId);
      setAdStatus(data);
      if (data.cooldownRemaining && data.cooldownRemaining > 0) {
        const currentStored = localStorage.getItem("ad_cooldown_expires_at");
        const storedRemaining = currentStored
          ? Math.ceil((Number(currentStored) - Date.now()) / 1000)
          : 0;
        if (data.cooldownRemaining > storedRemaining) {
          const expiresAt = Date.now() + data.cooldownRemaining * 1000;
          localStorage.setItem("ad_cooldown_expires_at", String(expiresAt));
          setAdCooldown(data.cooldownRemaining);
        }
      }
    } catch (e) {
      console.warn("Could not fetch ad status:", e);
    }
  }, [userId]);

  const { showAdsgramRewarded, showMonetagRewarded, showWithdrawalLimitAd } = useAdManager(
    userId,
    () => {
      fetchStatus();
      const expiresAt = Date.now() + 30 * 1000;
      localStorage.setItem("ad_cooldown_expires_at", String(expiresAt));
      setAdCooldown(30);
      if (onRewardClaimed) onRewardClaimed();
    }
  );

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  if (!adStatus) return null;

  const handleWatchAdsgram = async () => {
    if (adCooldown > 0 || loading) return;
    setLoading(true);
    await showAdsgramRewarded();
    setLoading(false);
  };

  const handleWatchMonetag = async () => {
    if (adCooldown > 0 || loading) return;
    setLoading(true);
    await showMonetagRewarded();
    setLoading(false);
  };

  const handleWatchLimitAd = async () => {
    if (adCooldown > 0 || loading) return;
    setLoading(true);
    await showWithdrawalLimitAd();
    const expiresAt = Date.now() + 30 * 1000;
    localStorage.setItem("ad_cooldown_expires_at", String(expiresAt));
    setAdCooldown(30);
    setLoading(false);
  };

  const adsgramMax = adStatus.adsgram.max || 100;
  const adsgramWatched = adStatus.adsgram.watched || 0;
  const isAdsgramMaxed = adsgramWatched >= adsgramMax;

  const monetagMax = adStatus.monetag.max || 100;
  const monetagWatched = adStatus.monetag.watched || 0;
  const monetagRequired = adStatus.monetag.requiredForWithdraw || 4;
  const isMonetagMaxed = monetagWatched >= monetagMax;

  const totalWatched = adStatus.totalWatched ?? adsgramWatched + monetagWatched;
  const totalMax = adStatus.totalMax ?? 200;
  const totalProgressPercent = Math.min(100, Math.round((totalWatched / totalMax) * 100));

  // Dynamic Tier calculation based on next ad view
  const getTierInfo = (watchedCount: number) => {
    const nextAd = watchedCount + 1;
    if (nextAd <= 20) {
      return {
        tier: 1,
        nc: 150,
        ton: "0.000010",
        label: "Tier 1: High TON",
        badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        payoutDesc: "+150 NC & +0.000010 TON",
      };
    } else if (nextAd <= 50) {
      return {
        tier: 2,
        nc: 200,
        ton: "0.000002",
        label: "Tier 2: Mid TON",
        badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        payoutDesc: "+200 NC & +0.000002 TON",
      };
    } else {
      return {
        tier: 3,
        nc: 300,
        ton: "0",
        label: "Tier 3: Fuel Grind",
        badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        payoutDesc: "+300 NC & 0 TON",
      };
    }
  };

  const adsgramTier = getTierInfo(adsgramWatched);
  const monetagTier = getTierInfo(monetagWatched);

  return (
    <div className="w-full space-y-2.5">
      {/* 200 Daily Ads Engine HUD Header */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-purple-950/30 to-amber-950/40 border border-blue-500/30 text-white shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-xs flex items-center gap-1.5">
                <span>200 Daily Ads Engine</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 border border-blue-500/40 text-blue-300">
                  100/100 Quota
                </span>
              </h4>
              <p className="text-[10px] text-slate-400">
                Tiered dual rewards • 30s network cooldown
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono font-bold text-xs text-cyber-gold block">
              {totalWatched} / {totalMax}
            </span>
            <span className="text-[9px] text-slate-400 font-mono">Total Viewed</span>
          </div>
        </div>

        {/* Total Progress Bar */}
        <div className="w-full bg-black/50 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 via-cyan-400 to-amber-400 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${totalProgressPercent}%` }}
          />
        </div>

        {/* Tier Roadmap Pills */}
        <div className="grid grid-cols-3 gap-1 pt-1 text-[9px] font-mono text-center">
          <div className="px-1.5 py-1 rounded-lg bg-black/40 border border-emerald-500/30 text-emerald-300">
            <span className="block font-bold">1–20 (Tier 1)</span>
            <span className="opacity-80">+150 NC • High TON</span>
          </div>
          <div className="px-1.5 py-1 rounded-lg bg-black/40 border border-blue-500/30 text-blue-300">
            <span className="block font-bold">21–50 (Tier 2)</span>
            <span className="opacity-80">+200 NC • Mid TON</span>
          </div>
          <div className="px-1.5 py-1 rounded-lg bg-black/40 border border-amber-500/30 text-amber-300">
            <span className="block font-bold">51–100 (Tier 3)</span>
            <span className="opacity-80">+300 NC • Fuel Grind</span>
          </div>
        </div>
      </div>

      {/* Global 30s Cooldown Active Banner */}
      {adCooldown > 0 && (
        <div className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-300 flex items-center justify-between text-xs animate-pulse">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-medium text-[11px]">
              Cooldown Active: Wait before next ad
            </span>
          </div>
          <span className="font-mono font-bold text-xs bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
            {adCooldown}s
          </span>
        </div>
      )}

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

      {/* 1. Adsgram Rewarded Video Card (100 Daily Cap) */}
      <div className="bg-neutral-900/90 border border-neutral-800 hover:border-purple-500/30 rounded-2xl p-3.5 flex items-center justify-between text-white transition-all">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Video className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-1.5">
              <h4 className="font-bold text-xs">Watch Adsgram Video</h4>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${adsgramTier.badgeColor}`}>
                {adsgramTier.label}
              </span>
            </div>
            <span className="text-[10px] font-mono text-neutral-400">
              ({adsgramWatched}/{adsgramMax})
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono pl-7.5">
            <span className="text-yellow-400 font-bold flex items-center gap-1">
              <NcIcon className="w-3.5 h-3.5" /> +{adsgramTier.nc} NC
            </span>
            {parseFloat(adsgramTier.ton) > 0 ? (
              <span className="text-blue-400 font-bold flex items-center gap-1">
                <TonIcon className="w-3.5 h-3.5" /> +{adsgramTier.ton} TON
              </span>
            ) : (
              <span className="text-slate-400 font-bold text-[10px]">
                0 TON (Fuel Grind)
              </span>
            )}
          </div>
        </div>

        <button
          onClick={handleWatchAdsgram}
          disabled={isAdsgramMaxed || loading || adCooldown > 0}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-bold text-xs rounded-xl transition shadow-md shadow-purple-500/10 active:scale-95 min-w-[85px] text-center shrink-0"
        >
          {isAdsgramMaxed
            ? "Maxed"
            : adCooldown > 0
            ? `Wait (${adCooldown}s)`
            : "Watch"}
        </button>
      </div>

      {/* 2. Monetag Rewarded Impression Card (100 Daily Cap) */}
      <div className="bg-neutral-900/90 border border-neutral-800 hover:border-blue-500/30 rounded-2xl p-3.5 flex items-center justify-between text-white transition-all">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-1.5">
              <h4 className="font-bold text-xs">Watch Monetag Ad</h4>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${monetagTier.badgeColor}`}>
                {monetagTier.label}
              </span>
            </div>
            <span className="text-[10px] font-mono text-neutral-400">
              ({monetagWatched}/{monetagMax})
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono pl-7.5">
            <span className="text-yellow-400 font-bold flex items-center gap-1">
              <NcIcon className="w-3.5 h-3.5" /> +{monetagTier.nc} NC
            </span>
            {parseFloat(monetagTier.ton) > 0 ? (
              <span className="text-blue-400 font-bold flex items-center gap-1">
                <TonIcon className="w-3.5 h-3.5" /> +{monetagTier.ton} TON
              </span>
            ) : (
              <span className="text-slate-400 font-bold text-[10px]">
                0 TON (Fuel Grind)
              </span>
            )}
          </div>
        </div>

        <button
          onClick={handleWatchMonetag}
          disabled={isMonetagMaxed || loading || adCooldown > 0}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-bold text-xs rounded-xl transition shadow-md shadow-blue-500/10 active:scale-95 min-w-[85px] text-center shrink-0"
        >
          {isMonetagMaxed
            ? "Maxed"
            : adCooldown > 0
            ? `Wait (${adCooldown}s)`
            : "Watch"}
        </button>
      </div>

      {/* 3. Withdrawal Limit Pass Mission (30 daily / 100 weekly) */}
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
