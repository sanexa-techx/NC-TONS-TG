import React, { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck,
  Lock,
  Unlock,
  Video,
  Clock,
  ExternalLink,
  ArrowRight,
  CheckCircle2,
  Play,
  Sparkles,
  Flame,
  RotateCcw,
} from "lucide-react";
import { TonIcon, NcIcon } from "./icons/index.js";
import { adService, AdServiceState } from "../services/adService.js";
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
  const [loadingStep, setLoadingStep] = useState<number | null>(null);
  const [adFeedback, setAdFeedback] = useState<string | null>(null);
  const [comboBonusToast, setComboBonusToast] = useState<string | null>(null);

  // AdService reactive subscription
  const [adEngineState, setAdEngineState] = useState<AdServiceState>(() =>
    adService.getSnapshot()
  );

  useEffect(() => {
    return adService.subscribe((state) => {
      setAdEngineState(state);
    });
  }, []);

  // Dwell partner link state: 15s countdown with 11s left default
  const [dwellSecondsLeft, setDwellSecondsLeft] = useState<number>(11);
  const [isDwelling, setIsDwelling] = useState<boolean>(false);
  const [dwellClaimed, setDwellClaimed] = useState<boolean>(false);

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

  // Mandatory 3-Category Combo Lock Execution:
  // Step 1: MONETAG -> Step 2: GIGAPUB -> Step 3: ADSGRAM -> Combo Bonus!
  const handleWatchComboStep = async (step: 1 | 2 | 3) => {
    if (loadingStep !== null) return;
    if (adEngineState.comboStep !== step) return;

    setLoadingStep(step);
    setAdFeedback(null);
    setComboBonusToast(null);

    const providerMap: Record<1 | 2 | 3, "monetag" | "gigapub" | "adsgram"> = {
      1: "monetag",
      2: "gigapub",
      3: "adsgram",
    };
    const provider = providerMap[step];

    try {
      // 1. Show Ad via real SDK or 5-second Obsidian Glass fallback modal
      console.log(`[AdMissions] Watching Step ${step}: ${provider.toUpperCase()}...`);
      const success = await adService.showAd(
        provider,
        "rewarded",
        `Step ${step} of 3: ${provider.toUpperCase()}`
      );

      if (!success) {
        setAdFeedback(`Playback cancelled or timed out. Please try again.`);
        setLoadingStep(null);
        return;
      }

      // 2. Claim step reward from backend
      try {
        await api.claimAdReward(provider, userId);
      } catch (claimErr) {
        console.warn("[AdMissions] Backend claim fallback:", claimErr);
      }

      // 3. Advance Combo Step
      const { nextStep, comboBonusReady } = adService.advanceComboStep();

      // Confetti burst for step completion
      try {
        const stepColors =
          step === 1
            ? ["#10B981", "#34D399", "#A7F3D0"]
            : step === 2
            ? ["#2563EB", "#60A5FA", "#BFDBFE"]
            : ["#9333EA", "#C084FC", "#E9D5FF"];
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
          colors: stepColors,
        });
      } catch (_) {}

      // 4. If Step 3 completed, award COMBO BONUS!
      if (comboBonusReady) {
        try {
          await api.claimComboReward(userId);
        } catch (comboErr) {
          console.warn("[AdMissions] Claim combo error:", comboErr);
        }

        try {
          confetti({
            particleCount: 140,
            spread: 90,
            origin: { y: 0.5 },
            colors: ["#F59E0B", "#10B981", "#2563EB", "#9333EA"],
          });
        } catch (_) {}

        setComboBonusToast(
          "🔥 +COMBO BONUS UNLOCKED! +500 NC & +0.0005 TON CREDITED! Cycle reset to Step 1."
        );
      } else {
        setAdFeedback(
          `🎉 Step ${step} (${provider.toUpperCase()}) Completed! Step ${nextStep} is now unlocked.`
        );
      }

      fetchStatus();
      if (onRewardClaimed) onRewardClaimed();
    } catch (err: any) {
      setAdFeedback(err.message || `Failed to complete ${provider.toUpperCase()} ad.`);
    } finally {
      setLoadingStep(null);
    }
  };

  const handleStartDwell = () => {
    if (dwellClaimed) return;
    setIsDwelling(true);
    window.open("https://t.me/toncoin", "_blank");
  };

  const currentStep = adEngineState.comboStep;
  const comboCompletions = adEngineState.comboCompletions;

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

      {/* 2. MANDATORY 3-CATEGORY COMBO LOCK CARD (MONETAG -> GIGAPUB -> ADSGRAM) */}
      <div className="w-full bg-slate-900/80 backdrop-blur-xl p-4 rounded-2xl border border-white/10 text-slate-100 shadow-lg space-y-3 relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Card Header & Combo Counter */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Flame size={17} />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                <span>3-CATEGORY COMBO LOCK</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Anti-Spam
                </span>
              </h4>
              <p className="text-[10px] font-mono text-slate-400">
                Monetag → Gigapub → Adsgram cycle for +Combo Bonus
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="font-mono font-black text-xs text-amber-400 flex items-center justify-end gap-1">
              <Sparkles size={12} />
              <span>{comboCompletions} Combos</span>
            </span>
            <span className="text-[9px] text-slate-400 block font-mono">Completed</span>
          </div>
        </div>

        {/* 3-Step Rotation HUD Indicator */}
        <div className="bg-slate-950/70 p-2.5 rounded-xl border border-white/10 flex items-center justify-between text-[11px] font-mono">
          {/* Step 1 Pill */}
          <div
            className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all ${
              currentStep === 1
                ? "bg-emerald-500/20 border-emerald-400/60 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)] font-black"
                : currentStep > 1
                ? "bg-slate-900 border-emerald-500/30 text-emerald-400/70 font-semibold"
                : "bg-slate-900/40 border-white/10 text-slate-500"
            }`}
          >
            {currentStep > 1 ? (
              <CheckCircle2 size={12} className="text-emerald-400" />
            ) : currentStep === 1 ? (
              <Unlock size={12} className="text-emerald-400 animate-pulse" />
            ) : (
              <Lock size={12} />
            )}
            <span>1. MONETAG</span>
          </div>

          <ArrowRight size={13} className="text-slate-500" />

          {/* Step 2 Pill */}
          <div
            className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all ${
              currentStep === 2
                ? "bg-blue-500/20 border-blue-400/60 text-blue-300 shadow-[0_0_10px_rgba(37,99,235,0.3)] font-black"
                : currentStep > 2
                ? "bg-slate-900 border-blue-500/30 text-blue-400/70 font-semibold"
                : "bg-slate-900/40 border-white/10 text-slate-500"
            }`}
          >
            {currentStep > 2 ? (
              <CheckCircle2 size={12} className="text-blue-400" />
            ) : currentStep === 2 ? (
              <Unlock size={12} className="text-blue-400 animate-pulse" />
            ) : (
              <Lock size={12} />
            )}
            <span>2. GIGAPUB</span>
          </div>

          <ArrowRight size={13} className="text-slate-500" />

          {/* Step 3 Pill */}
          <div
            className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all ${
              currentStep === 3
                ? "bg-purple-500/20 border-purple-400/60 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)] font-black"
                : "bg-slate-900/40 border-white/10 text-slate-500"
            }`}
          >
            {currentStep === 3 ? (
              <Unlock size={12} className="text-purple-400 animate-pulse" />
            ) : (
              <Lock size={12} />
            )}
            <span>3. ADSGRAM</span>
          </div>
        </div>

        {/* Combo Bonus Reward Callout */}
        <div className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/15 via-purple-500/15 to-emerald-500/15 border border-amber-500/30 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-1.5 text-amber-300 font-bold">
            <Sparkles size={14} className="text-amber-400" />
            <span>FINISH STEP 3 FOR COMBO BONUS:</span>
          </div>
          <div className="flex items-center space-x-2 font-black">
            <span className="text-emerald-400">+500 NC</span>
            <span className="text-slate-500">•</span>
            <span className="text-cyan-400">+0.0005 TON</span>
          </div>
        </div>

        {/* THE 3 SEQUENTIAL STEP CARDS */}
        <div className="space-y-3 pt-1">
          {/* STEP 1: MONETAG CARD */}
          <div
            className={`p-3.5 rounded-2xl border transition-all ${
              currentStep === 1
                ? "bg-slate-950/85 border-emerald-500/50 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500/30"
                : currentStep > 1
                ? "bg-slate-950/50 border-emerald-500/20 opacity-80"
                : "bg-slate-950/40 border-white/5 opacity-50"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    currentStep === 1
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : "bg-slate-900 text-slate-400 border border-white/10"
                  }`}
                >
                  <Video size={14} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-white">STEP 1: MONETAG</span>
                    {currentStep === 1 && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        ACTIVE STEP
                      </span>
                    )}
                    {currentStep > 1 && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-950/50 text-emerald-400 border border-emerald-500/30">
                        COMPLETED ✅
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">High-CPM Interstitial / Rewarded</span>
                </div>
              </div>

              <div className="text-right font-mono text-[11px] text-emerald-400 font-bold">
                +150 - 300 NC
              </div>
            </div>

            {/* Action Button */}
            {currentStep === 1 ? (
              <button
                onClick={() => handleWatchComboStep(1)}
                disabled={loadingStep !== null}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-98 shadow-md shadow-emerald-500/25 cursor-pointer"
              >
                {loadingStep === 1 ? (
                  <span>STREAMING MONETAG AD...</span>
                ) : (
                  <>
                    <Play size={13} className="fill-slate-950" />
                    <span>WATCH STEP 1 (MONETAG)</span>
                  </>
                )}
              </button>
            ) : currentStep > 1 ? (
              <div className="w-full py-2 px-3 rounded-xl bg-slate-900/60 border border-emerald-500/20 text-emerald-400/80 font-mono text-xs font-semibold flex items-center justify-center gap-2">
                <CheckCircle2 size={13} />
                <span>STEP 1 LOCKED (COMPLETED — PROCEED TO STEP 2)</span>
              </div>
            ) : (
              <div className="w-full py-2 px-3 rounded-xl bg-slate-900/40 border border-white/5 text-slate-500 font-mono text-xs flex items-center justify-center gap-2">
                <Lock size={13} />
                <span>LOCKED</span>
              </div>
            )}
          </div>

          {/* STEP 2: GIGAPUB CARD */}
          <div
            className={`p-3.5 rounded-2xl border transition-all ${
              currentStep === 2
                ? "bg-slate-950/85 border-blue-500/50 shadow-md shadow-blue-500/10 ring-1 ring-blue-500/30"
                : currentStep > 2
                ? "bg-slate-950/50 border-blue-500/20 opacity-80"
                : "bg-slate-950/40 border-white/5 opacity-60"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    currentStep === 2
                      ? "bg-blue-600/20 text-blue-400 border border-blue-500/40"
                      : "bg-slate-900 text-slate-400 border border-white/10"
                  }`}
                >
                  <Video size={14} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-white">STEP 2: GIGAPUB</span>
                    {currentStep === 2 && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-blue-600/20 text-blue-300 border border-blue-500/40">
                        ACTIVE STEP
                      </span>
                    )}
                    {currentStep > 2 && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-blue-950/50 text-blue-400 border border-blue-500/30">
                        COMPLETED ✅
                      </span>
                    )}
                    {currentStep < 2 && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-slate-900 text-slate-500 border border-white/10">
                        LOCKED
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Telegram Native Rewarded</span>
                </div>
              </div>

              <div className="text-right font-mono text-[11px] text-blue-400 font-bold">
                +150 - 300 NC
              </div>
            </div>

            {/* Action Button */}
            {currentStep === 2 ? (
              <button
                onClick={() => handleWatchComboStep(2)}
                disabled={loadingStep !== null}
                className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-98 shadow-md shadow-blue-500/25 cursor-pointer"
              >
                {loadingStep === 2 ? (
                  <span>STREAMING GIGAPUB AD...</span>
                ) : (
                  <>
                    <Play size={13} className="fill-white" />
                    <span>WATCH STEP 2 (GIGAPUB)</span>
                  </>
                )}
              </button>
            ) : currentStep > 2 ? (
              <div className="w-full py-2 px-3 rounded-xl bg-slate-900/60 border border-blue-500/20 text-blue-400/80 font-mono text-xs font-semibold flex items-center justify-center gap-2">
                <CheckCircle2 size={13} />
                <span>STEP 2 LOCKED (COMPLETED — PROCEED TO STEP 3)</span>
              </div>
            ) : (
              <div className="w-full py-2 px-3 rounded-xl bg-slate-900/40 border border-white/5 text-slate-500 font-mono text-xs flex items-center justify-center gap-2">
                <Lock size={13} />
                <span>LOCKED (COMPLETE STEP 1 FIRST)</span>
              </div>
            )}
          </div>

          {/* STEP 3: ADSGRAM CARD */}
          <div
            className={`p-3.5 rounded-2xl border transition-all ${
              currentStep === 3
                ? "bg-slate-950/85 border-purple-500/50 shadow-md shadow-purple-500/10 ring-1 ring-purple-500/30"
                : "bg-slate-950/40 border-white/5 opacity-60"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    currentStep === 3
                      ? "bg-purple-600/20 text-purple-400 border border-purple-500/40"
                      : "bg-slate-900 text-slate-400 border border-white/10"
                  }`}
                >
                  <Video size={14} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-white">STEP 3: ADSGRAM</span>
                    {currentStep === 3 ? (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-purple-600/20 text-purple-300 border border-purple-500/40 animate-pulse">
                        FINAL STEP • +COMBO BONUS
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-slate-900 text-slate-500 border border-white/10">
                        LOCKED
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Telegram Sad Adsgram Video</span>
                </div>
              </div>

              <div className="text-right font-mono text-[11px] text-purple-400 font-bold">
                +150 - 300 NC
              </div>
            </div>

            {/* Action Button */}
            {currentStep === 3 ? (
              <button
                onClick={() => handleWatchComboStep(3)}
                disabled={loadingStep !== null}
                className="w-full py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-98 shadow-md shadow-purple-500/30 cursor-pointer"
              >
                {loadingStep === 3 ? (
                  <span>STREAMING ADSGRAM AD...</span>
                ) : (
                  <>
                    <Sparkles size={13} className="text-amber-300 animate-spin" />
                    <span>WATCH STEP 3 & CLAIM COMBO BONUS</span>
                  </>
                )}
              </button>
            ) : (
              <div className="w-full py-2 px-3 rounded-xl bg-slate-900/40 border border-white/5 text-slate-500 font-mono text-xs flex items-center justify-center gap-2">
                <Lock size={13} />
                <span>LOCKED (COMPLETE STEP 2 FIRST)</span>
              </div>
            )}
          </div>
        </div>

        {/* Feedback Messages */}
        {comboBonusToast && (
          <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-blue-500/20 border border-amber-400/50 text-white text-xs font-mono font-bold text-center flex items-center justify-center gap-2 animate-bounce">
            <Sparkles size={16} className="text-amber-400" />
            <span>{comboBonusToast}</span>
          </div>
        )}

        {adFeedback && (
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/10 text-slate-200 text-xs font-mono text-center flex items-center justify-center gap-1.5">
            <CheckCircle2 size={14} className="text-[#10B981] shrink-0" />
            <span>{adFeedback}</span>
          </div>
        )}

        {/* Reset Combo Option if needed */}
        <div className="flex items-center justify-end pt-1">
          <button
            onClick={() => adService.resetComboCycle()}
            className="text-[10px] font-mono text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
            title="Reset Combo Cycle"
          >
            <RotateCcw size={10} />
            <span>Reset Cycle to Step 1</span>
          </button>
        </div>
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

export default AdMissionsSection;
