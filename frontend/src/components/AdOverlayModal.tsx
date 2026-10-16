import React, { useEffect, useState } from "react";
import { adService, AdModalState } from "../services/adService.js";
import { Sparkles, ShieldCheck, CheckCircle2, X, Radio } from "lucide-react";
import { NcIcon, TonIcon } from "./icons/index.js";

export const AdOverlayModal: React.FC = () => {
  const [modal, setModal] = useState<AdModalState>(() => adService.getSnapshot().modal);

  useEffect(() => {
    return adService.subscribe((state) => {
      setModal(state.modal);
    });
  }, []);

  if (!modal.isOpen) return null;

  const secondsLeft = modal.secondsLeft;
  const totalSeconds = modal.totalSeconds || 5;
  const progressPercent = Math.max(0, Math.min(100, ((totalSeconds - secondsLeft) / totalSeconds) * 100));

  const networkColors = {
    MONETAG: {
      badgeBg: "bg-emerald-500/20 border-emerald-400/50 text-emerald-300",
      glow: "from-emerald-500/20 to-teal-500/10",
      glowRing: "border-emerald-400/60 shadow-[0_0_30px_rgba(16,185,129,0.35)]",
      accent: "text-emerald-400",
      progressBg: "bg-emerald-500",
    },
    GIGAPUB: {
      badgeBg: "bg-blue-500/20 border-blue-400/50 text-blue-300",
      glow: "from-blue-500/20 to-indigo-500/10",
      glowRing: "border-blue-400/60 shadow-[0_0_30px_rgba(37,99,235,0.35)]",
      accent: "text-blue-400",
      progressBg: "bg-blue-500",
    },
    ADSGRAM: {
      badgeBg: "bg-purple-500/20 border-purple-400/50 text-purple-300",
      glow: "from-purple-500/20 to-pink-500/10",
      glowRing: "border-purple-400/60 shadow-[0_0_30px_rgba(168,85,247,0.35)]",
      accent: "text-purple-400",
      progressBg: "bg-purple-500",
    },
  }[modal.provider] || {
    badgeBg: "bg-blue-500/20 border-blue-400/50 text-blue-300",
    glow: "from-blue-500/20 to-indigo-500/10",
    glowRing: "border-blue-400/60 shadow-[0_0_30px_rgba(37,99,235,0.35)]",
    accent: "text-blue-400",
    progressBg: "bg-blue-500",
  };

  const handleClaimNow = () => {
    if (modal.onComplete) {
      modal.onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#060911]/92 backdrop-blur-2xl animate-in fade-in duration-200">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-emerald-500/15 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full bg-blue-600/15 blur-[100px] pointer-events-none" />

      {/* Main Obsidian Glass Card */}
      <div className="relative w-full max-w-sm rounded-3xl bg-slate-900/85 backdrop-blur-2xl border border-white/15 p-6 shadow-2xl shadow-black/90 text-center flex flex-col items-center overflow-hidden">
        {/* Subtle Top Inner Sheen */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

        {/* Top Header Bar */}
        <div className="w-full flex items-center justify-between mb-4">
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full border text-[11px] font-mono font-bold tracking-wider uppercase shadow-xs backdrop-blur-md">
            <Radio size={12} className={`${networkColors.accent} animate-pulse`} />
            <span className={networkColors.accent}>{modal.provider} SPONSOR</span>
          </div>

          <button
            onClick={() => adService.dismissModal()}
            className="w-7 h-7 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* Circular Countdown Badge */}
        <div className="relative my-4 flex items-center justify-center">
          {/* Animated Glow Halo */}
          <div className={`w-32 h-32 rounded-full border-2 ${networkColors.glowRing} bg-slate-950/70 flex flex-col items-center justify-center relative overflow-hidden`}>
            {/* Ambient inner gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${networkColors.glow} pointer-events-none`} />

            {secondsLeft > 0 ? (
              <>
                <span className="text-4xl font-black font-mono tracking-tight text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">
                  {secondsLeft}s
                </span>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mt-0.5">
                  REWARD LOCK
                </span>
              </>
            ) : (
              <div className="flex flex-col items-center animate-bounce">
                <CheckCircle2 size={36} className="text-emerald-400" />
                <span className="text-[10px] font-mono text-emerald-300 font-bold tracking-widest mt-1">
                  READY
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Ad Title & Status */}
        <h3 className="text-lg font-black text-white tracking-wide mt-2">
          {secondsLeft > 0 ? "SPONSOR AD STREAMING" : "AD VERIFIED & READY"}
        </h3>

        <p className="text-xs text-slate-400 mt-1 max-w-[280px] leading-relaxed">
          {secondsLeft > 0
            ? "Stay on this screen for 5 seconds to authenticate your view and claim your NC + TON reward."
            : "Verification completed successfully! Click Claim to deposit your crypto."}
        </p>

        {/* Rewards Preview Pill */}
        <div className="mt-4 w-full py-2 px-3 rounded-xl bg-slate-950/70 border border-white/10 flex items-center justify-around text-xs font-mono">
          <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
            <NcIcon className="w-3.5 h-3.5" />
            <span>+150 - 300 NC</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center space-x-1.5 text-blue-300 font-bold">
            <TonIcon className="w-3.5 h-3.5" />
            <span>+0.000010 TON</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-950/80 rounded-full h-2 mt-4 overflow-hidden border border-white/10">
          <div
            className={`h-full ${networkColors.progressBg} transition-all duration-1000 ease-linear rounded-full`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Action Button */}
        <div className="w-full mt-5">
          {secondsLeft > 0 ? (
            <div className="w-full py-3 rounded-xl bg-slate-800/60 border border-white/10 text-slate-400 font-mono text-xs font-bold flex items-center justify-center space-x-2">
              <ShieldCheck size={15} className="text-slate-400 animate-pulse" />
              <span>STREAMING AD... ({secondsLeft}s)</span>
            </div>
          ) : (
            <button
              onClick={handleClaimNow}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all active:scale-98 shadow-lg shadow-emerald-500/30 cursor-pointer"
            >
              <Sparkles size={16} />
              <span>CLAIM REWARD NOW</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdOverlayModal;
