import React, { useEffect, useState, useCallback } from "react";
import { ShieldCheck, Lock, Video, Clock, ExternalLink, ArrowRight, CheckCircle2, Play, Sparkles } from "lucide-react";
import { TonIcon, NcIcon } from "./icons/index.js";
import { showSmartRewardedAd, showSpecificRewardedAd, getAdManagerStats, AD_STATE } from "../services/adManager.js";
import { api } from "../services/api.js";
import { DailyAdStatusResponse } from "../types/index.js";
import confetti from "canvas-confetti";

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
  const [activeProviderLoading, setActiveProviderLoading] = useState<string | null>(null);
  const [adFeedback, setAdFeedback] = useState<string | null>(null);

  // Dwell partner link state: 15s countdown with 11s left default
  const [dwellSecondsLeft, setDwellSecondsLeft] = useState<number>(11);
  const [isDwelling, setIsDwelling] = useState<boolean>(false);
  const [dwellClaimed, setDwellClaimed] = useState<boolean>(false);

  // Global & Provider-specific 30s cooldowns
  const [adCooldown, setAdCooldown] = useState<number>(() => {
    const stats = getAdManagerStats();
    return stats.rewardedCooldownLeft;
  });

  const [providerCooldowns, setProviderCooldowns] = useState(() => {
    const stats = getAdManagerStats();
    return (
      stats.providerCooldowns || {
        monetag: 0,
        gigapub: 0,
        adsgram: 0,
      }
    );
  });

  const [liveCounts, setLiveCounts] = useState(() => ({
    monetag: AD_STATE.counts.monetag,
    gigapub: AD_STATE.counts.gigapub,
    adsgram: AD_STATE.counts.adsgram,
  }));

  // Countdown loop for cooldowns (ticks every 1s)
  useEffect(() => {
    const timer = setInterval(() => {
      const stats = getAdManagerStats();
      setAdCooldown(stats.rewardedCooldownLeft);
      if (stats.providerCooldowns) {
        setProviderCooldowns(stats.providerCooldowns);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Countdown loop for 15s Dwell Partner Link
  useEffect(() => {
    if (!isDwelling || dwellSecondsLeft <= 0 || dwellClaimed) return;
    const interval = setInterval(() => {
      setDwellSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsDwelling(false);
          setDwellClaimed(true);
          try {
            confetti({
              particleCount: 80,
              spread: 60,
              origin: { y: 0.6 },
              colors: ["#2563EB", "#10B981"],
            });
          } catch (_) {}
          if (onRewardClaimed) onRewardClaimed();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isDwelling, dwellSecondsLeft, dwellClaimed, onRewardClaimed]);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await api.getAdStatus(userId);
      setAdStatus(data);
    } catch (e) {
      console.warn("Could not fetch ad status:", e);
    }
  }, [userId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Handler for separate ad provider buttons (Monetag, Gigapub, Adsgram)
  const handleWatchProviderAd = async (provider: "monetag" | "gigapub" | "adsgram") => {
    if (providerCooldowns[provider] > 0 || activeProviderLoading || loading) return;
    setActiveProviderLoading(provider);
    setAdFeedback(null);

    try {
      const res = await showSpecificRewardedAd(provider, false);
      if (res.success) {
        setLiveCounts({
          monetag: AD_STATE.counts.monetag,
          gigapub: AD_STATE.counts.gigapub,
          adsgram: AD_STATE.counts.adsgram,
        });

        const stats = getAdManagerStats();
        if (stats.providerCooldowns) {
          setProviderCooldowns(stats.providerCooldowns);
        }

        try {
          const confettiColors =
            provider === "monetag"
              ? ["#10B981", "#34D399", "#A7F3D0"]
              : provider === "gigapub"
              ? ["#2563EB", "#60A5FA", "#BFDBFE"]
              : ["#9333EA", "#C084FC", "#E9D5FF"];
          confetti({
            particleCount: 95,
            spread: 70,
            origin: { y: 0.6 },
            colors: confettiColors,
          });
        } catch (_) {}

        setAdFeedback(
          `🎉 ${res.provider} ad completed! Earned +${res.reward?.nc} NC & +${res.reward?.ton} TON (${res.reward?.tier})`
        );
        fetchStatus();
        if (onRewardClaimed) onRewardClaimed();
      } else {
        setAdFeedback(res.reason || `${provider.toUpperCase()} ad could not be displayed.`);
      }
    } catch (err: any) {
      setAdFeedback(err.message || `Failed to trigger ${provider} ad.`);
    } finally {
      setActiveProviderLoading(null);
    }
  };

  // Handler for global auto-waterfall ad
  const handleWatchSmartAd = async () => {
    if (adCooldown > 0 || loading || activeProviderLoading) return;
    setLoading(true);
    setAdFeedback(null);

    try {
      const res = await showSmartRewardedAd(false);
      if (res.success) {
        setLiveCounts({
          monetag: AD_STATE.counts.monetag,
          gigapub: AD_STATE.counts.gigapub,
          adsgram: AD_STATE.counts.adsgram,
        });

        const stats = getAdManagerStats();
        if (stats.providerCooldowns) {
          setProviderCooldowns(stats.providerCooldowns);
        }

        try {
          confetti({
            particleCount: 90,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#10B981", "#2563EB", "#9333EA"],
          });
        } catch (_) {}

        setAdFeedback(
          `🎉 Ad delivered via ${res.provider}! Earned +${res.reward?.nc} NC & +${res.reward?.ton} TON (${res.reward?.tier})`
        );
        fetchStatus();
        if (onRewardClaimed) onRewardClaimed();
      } else {
        setAdFeedback(res.reason || "Ad playback unavailable. Please try again.");
      }
    } catch (err: any) {
      setAdFeedback(err.message || "Failed to trigger ad.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartDwell = () => {
    if (dwellClaimed) return;
    setIsDwelling(true);
    // Optionally open demo sponsor link
    window.open("https://t.me/toncoin", "_blank");
  };

  const totalWatched = liveCounts.monetag + liveCounts.gigapub + liveCounts.adsgram;
  const totalMax = 200;
  const totalPercent = Math.min(100, Math.round((totalWatched / totalMax) * 100));

  return (
    <div className="w-full space-y-3.5">
      {/* 1. "15-SECOND DWELL PARTNER LINK" Card */}
      <div className="w-full bg-slate-900/80 backdrop-blur-xl p-4 rounded-2xl border border-white/10 text-slate-100 shadow-lg relative overflow-hidden group">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <ExternalLink size={17} />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase text-white tracking-wider">
                15-SECOND DWELL PARTNER LINK
              </h4>
              <p className="text-[10px] font-mono text-slate-400">Visit sponsor link to earn dual rewards</p>
            </div>
          </div>

          {/* Cobalt Countdown Pill: "15s • 11s LEFT" */}
          <div className="px-2.5 py-1 rounded-full bg-slate-950/80 border border-blue-500/40 text-blue-400 font-mono font-bold text-xs shadow-2xs flex items-center gap-1.5">
            <Clock size={12} className="text-blue-400 animate-spin" />
            <span>
              {dwellClaimed
                ? "CLAIMED ✅"
                : `15s • ${dwellSecondsLeft}s LEFT`}
            </span>
          </div>
        </div>

        <div className="bg-slate-950/70 p-2.5 rounded-xl border border-white/10 my-2.5 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-1 text-[#10B981] font-bold">
            <NcIcon className="w-4 h-4" />
            <span>+100 NC</span>
          </div>
          <div className="flex items-center gap-1 text-cyan-400 font-bold">
            <TonIcon className="w-4 h-4" />
            <span>+0.000100 TON</span>
          </div>
          <span className="text-[10px] text-slate-400 font-sans">15s Anti-Bot Proof</span>
        </div>

        <button
          onClick={handleStartDwell}
          disabled={dwellClaimed || isDwelling}
          className={`w-full py-2.5 px-4 rounded-xl font-extrabold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition active:scale-98 cursor-pointer shadow-xs ${
            dwellClaimed
              ? "bg-slate-950/70 text-slate-500 border border-white/10"
              : isDwelling
              ? "bg-blue-600 text-white animate-pulse"
              : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"
          }`}
        >
          {dwellClaimed ? (
            <span>MISSION COMPLETED (+100 NC & TON CLAIMED)</span>
          ) : isDwelling ? (
            <span>DWELL TIMER RUNNING ({dwellSecondsLeft}s LEFT)...</span>
          ) : (
            <>
              <span>START 15-SECOND DWELL MISSION</span>
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </div>

      {/* 2. "WATCH ADS (200 DAILY SYSTEM)" Card */}
      <div className="w-full bg-slate-900/80 backdrop-blur-xl p-4 rounded-2xl border border-white/10 text-slate-100 shadow-lg space-y-3">
        {/* Header & Daily Total */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Video size={17} />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase text-white tracking-wider">
                WATCH ADS (200 DAILY SYSTEM)
              </h4>
              <p className="text-[10px] font-mono text-slate-400">Multi-network high-CPM waterfall</p>
            </div>
          </div>

          <div className="text-right">
            <span className="font-mono font-black text-xs text-blue-400">
              {totalWatched} / {totalMax}
            </span>
            <span className="text-[9px] text-slate-400 block font-mono">Daily Viewed</span>
          </div>
        </div>

        {/* Total Progress Bar */}
        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-white/10">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-[#10B981] rounded-full transition-all duration-500"
            style={{ width: `${totalPercent}%` }}
          />
        </div>

        {/* Priority Waterfall Queue Flow Banner */}
        <div className="bg-slate-950/70 p-2.5 rounded-xl border border-white/10 space-y-1">
          <div className="text-[10px] font-mono font-bold text-slate-400 uppercase flex items-center justify-between">
            <span>Priority Waterfall Queue</span>
            <span className="text-blue-400 font-bold">Smart Micro-Rotation</span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono pt-0.5">
            <span className="px-2 py-0.5 rounded bg-slate-900 text-emerald-400 border border-emerald-500/30 font-bold">
              1. Monetag
            </span>
            <ArrowRight size={12} className="text-slate-400" />
            <span className="px-2 py-0.5 rounded bg-slate-900 text-blue-400 border border-blue-500/30 font-bold">
              2. Gigapub
            </span>
            <ArrowRight size={12} className="text-slate-400" />
            <span className="px-2 py-0.5 rounded bg-slate-900 text-purple-400 border border-purple-500/30 font-bold">
              3. Adsgram
            </span>
          </div>
        </div>

        {/* 3-Tier CPM Protection Pills */}
        <div className="grid grid-cols-1 gap-1.5 pt-1">
          <div className="px-2.5 py-1.5 rounded-xl bg-slate-950/70 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono flex items-center justify-between">
            <span className="font-bold">ADS 1-20: HIGH (NC + Full TON)</span>
            <span className="text-emerald-400 font-bold">+300 NC • 0.0005 TON</span>
          </div>
          <div className="px-2.5 py-1.5 rounded-xl bg-slate-950/70 border border-blue-500/30 text-blue-300 text-[10px] font-mono flex items-center justify-between">
            <span className="font-bold">ADS 21-50: MID (NC + 50% TON)</span>
            <span className="text-blue-400 font-bold">+200 NC • 0.0002 TON</span>
          </div>
          <div className="px-2.5 py-1.5 rounded-xl bg-slate-950/70 border border-amber-500/30 text-amber-300 text-[10px] font-mono flex items-center justify-between">
            <span className="font-bold">ADS 51+: FUEL & NC ONLY (0 TON)</span>
            <span className="text-amber-400 font-bold">+150 NC • Fuel Boost</span>
          </div>
        </div>

        {/* Separate Ad Provider Cards & Dedicated Buttons with 30s Cooldown */}
        <div className="space-y-3 pt-1 border-t border-white/10">
          <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-400 uppercase">
            <span>Choose Ad Provider</span>
            <span className="text-[10px] text-slate-500 font-normal">30s cooldown per ad</span>
          </div>

          {/* 1. MONETAG DEDICATED CARD & BUTTON */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/10 shadow-md space-y-2.5 hover:border-emerald-500/40 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Video size={14} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-white tracking-wide">
                      MONETAG
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Priority #1
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">High-CPM Rewarded Video</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono font-black text-emerald-400">
                  {liveCounts.monetag} / {AD_STATE.dailyCaps.monetag}
                </span>
                <span className="text-[9px] text-slate-400 block font-mono">Daily Cap</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-white/10">
              <div
                className="bg-[#10B981] h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (liveCounts.monetag / AD_STATE.dailyCaps.monetag) * 100)}%`,
                }}
              />
            </div>

            {/* Monetag Dedicated 30s Cooldown & Action Button */}
            {providerCooldowns.monetag > 0 ? (
              <button
                disabled
                className="w-full py-2.5 px-3 rounded-xl bg-slate-900 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center gap-2 cursor-not-allowed animate-pulse shadow-2xs"
              >
                <Clock size={13} className="text-emerald-400 animate-spin" />
                <span>MONETAG COOLDOWN: {providerCooldowns.monetag}s REMAINING</span>
              </button>
            ) : (
              <button
                onClick={() => handleWatchProviderAd("monetag")}
                disabled={activeProviderLoading !== null || loading || liveCounts.monetag >= AD_STATE.dailyCaps.monetag}
                className="w-full py-2.5 px-3 rounded-xl bg-[#10B981] hover:bg-[#059669] disabled:bg-slate-900 disabled:text-slate-500 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-98 shadow-sm shadow-emerald-500/20 cursor-pointer"
              >
                {activeProviderLoading === "monetag" ? (
                  <span>DELIVERING MONETAG AD...</span>
                ) : liveCounts.monetag >= AD_STATE.dailyCaps.monetag ? (
                  <span>MONETAG DAILY CAP REACHED (80/80)</span>
                ) : (
                  <>
                    <Play size={13} className="fill-white" />
                    <span>WATCH MONETAG AD (+NC & TON)</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* 2. GIGAPUB DEDICATED CARD & BUTTON */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/10 shadow-md space-y-2.5 hover:border-blue-500/40 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Video size={14} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-white tracking-wide">
                      GIGAPUB
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-blue-600/20 text-blue-300 border border-blue-500/40">
                      Priority #2 • showGiga
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Telegram Native Rewarded</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono font-black text-blue-400">
                  {liveCounts.gigapub} / {AD_STATE.dailyCaps.gigapub}
                </span>
                <span className="text-[9px] text-slate-400 block font-mono">Daily Cap</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-white/10">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (liveCounts.gigapub / AD_STATE.dailyCaps.gigapub) * 100)}%`,
                }}
              />
            </div>

            {/* Gigapub Dedicated 30s Cooldown & Action Button */}
            {providerCooldowns.gigapub > 0 ? (
              <button
                disabled
                className="w-full py-2.5 px-3 rounded-xl bg-slate-900 border border-blue-500/30 text-blue-400 font-mono font-bold text-xs flex items-center justify-center gap-2 cursor-not-allowed animate-pulse shadow-2xs"
              >
                <Clock size={13} className="text-blue-400 animate-spin" />
                <span>GIGAPUB COOLDOWN: {providerCooldowns.gigapub}s REMAINING</span>
              </button>
            ) : (
              <button
                onClick={() => handleWatchProviderAd("gigapub")}
                disabled={activeProviderLoading !== null || loading || liveCounts.gigapub >= AD_STATE.dailyCaps.gigapub}
                className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-900 disabled:text-slate-500 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-98 shadow-sm shadow-blue-500/20 cursor-pointer"
              >
                {activeProviderLoading === "gigapub" ? (
                  <span>DELIVERING GIGAPUB AD (showGiga)...</span>
                ) : liveCounts.gigapub >= AD_STATE.dailyCaps.gigapub ? (
                  <span>GIGAPUB DAILY CAP REACHED (70/70)</span>
                ) : (
                  <>
                    <Play size={13} className="fill-white" />
                    <span>WATCH GIGAPUB AD (+NC & TON)</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* 3. ADSGRAM DEDICATED CARD & BUTTON */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/10 shadow-md space-y-2.5 hover:border-purple-500/40 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Video size={14} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-white tracking-wide">
                      ADSGRAM
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-purple-600/20 text-purple-300 border border-purple-500/40">
                      Priority #3
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Telegram Adsgram Network</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono font-black text-purple-400">
                  {liveCounts.adsgram} / {AD_STATE.dailyCaps.adsgram}
                </span>
                <span className="text-[9px] text-slate-400 block font-mono">Daily Cap</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-white/10">
              <div
                className="bg-purple-500 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (liveCounts.adsgram / AD_STATE.dailyCaps.adsgram) * 100)}%`,
                }}
              />
            </div>

            {/* Adsgram Dedicated 30s Cooldown & Action Button */}
            {providerCooldowns.adsgram > 0 ? (
              <button
                disabled
                className="w-full py-2.5 px-3 rounded-xl bg-slate-900 border border-purple-500/30 text-purple-400 font-mono font-bold text-xs flex items-center justify-center gap-2 cursor-not-allowed animate-pulse shadow-2xs"
              >
                <Clock size={13} className="text-purple-400 animate-spin" />
                <span>ADSGRAM COOLDOWN: {providerCooldowns.adsgram}s REMAINING</span>
              </button>
            ) : (
              <button
                onClick={() => handleWatchProviderAd("adsgram")}
                disabled={activeProviderLoading !== null || loading || liveCounts.adsgram >= AD_STATE.dailyCaps.adsgram}
                className="w-full py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-900 disabled:text-slate-500 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-98 shadow-sm shadow-purple-500/20 cursor-pointer"
              >
                {activeProviderLoading === "adsgram" ? (
                  <span>DELIVERING ADSGRAM AD...</span>
                ) : liveCounts.adsgram >= AD_STATE.dailyCaps.adsgram ? (
                  <span>ADSGRAM DAILY CAP REACHED (50/50)</span>
                ) : (
                  <>
                    <Play size={13} className="fill-white" />
                    <span>▶ Watch Ad (+NC & TON)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Global Auto Waterfall Quick Button */}
        <div className="pt-1 border-t border-white/10">
          <button
            onClick={handleWatchSmartAd}
            disabled={loading || activeProviderLoading !== null || adCooldown > 0 || totalWatched >= totalMax}
            className="w-full py-2.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/50 disabled:bg-slate-900/60 disabled:text-slate-500 text-amber-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer shadow-xs"
          >
            <Sparkles size={14} className="text-amber-400" />
            <span>
              {adCooldown > 0
                ? `⚡ Smart Auto-Ad (${adCooldown}s)`
                : "⚡ Smart Auto-Ad"}
            </span>
          </button>
        </div>

        {adFeedback && (
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/10 text-slate-200 text-xs font-mono text-center flex items-center justify-center gap-1.5">
            <CheckCircle2 size={14} className="text-[#10B981] shrink-0" />
            <span>{adFeedback}</span>
          </div>
        )}
      </div>

      {/* Daily Withdrawal Requirement Badge */}
      {adStatus && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs transition-all shadow-md ${
            adStatus.canWithdraw
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-amber-500/10 border-amber-500/30 text-amber-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {adStatus.canWithdraw ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <Lock className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <div>
              <h5 className="font-bold flex items-center gap-1.5 text-white">
                <span>Daily Gate • Watch Ads to Unlock</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-950/70 border border-white/10 font-semibold text-amber-300">
                  UTC Reset
                </span>
              </h5>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="font-mono font-bold text-[11px] block">
              {adStatus.canWithdraw ? "UNLOCKED ✅" : "LOCKED 🔒"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
