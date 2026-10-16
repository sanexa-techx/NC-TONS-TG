import React, { useEffect, useState } from "react";
import { adService, AdServiceState } from "../services/adService.js";
import { Zap, Gamepad2, Radio } from "lucide-react";

export const AdCountdownBadge: React.FC = () => {
  const [adState, setAdState] = useState<AdServiceState>(() => adService.getSnapshot());

  useEffect(() => {
    return adService.subscribe((state) => {
      setAdState(state);
    });
  }, []);

  if (adState.modal.isOpen) {
    return (
      <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-purple-500/15 border border-purple-400/40 text-[11px] font-mono text-purple-300 font-bold shadow-xs animate-pulse">
        <Radio size={12} className="text-purple-400" />
        <span>AD PLAYING</span>
      </div>
    );
  }

  if (adState.isPlayingGame) {
    return (
      <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-blue-500/15 border border-blue-400/30 text-[11px] font-mono text-blue-300 font-semibold shadow-xs">
        <Gamepad2 size={13} className="text-blue-400" />
        <span>{adState.interstitialQueued ? "AD QUEUED" : "ADS PAUSED"}</span>
      </div>
    );
  }

  const isMonetag = adState.nextInterstitialProvider === "MONETAG";

  return (
    <div
      className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-slate-900/80 border text-[11px] font-mono font-bold shadow-xs transition-colors ${
        isMonetag
          ? "border-emerald-500/30 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
          : "border-blue-500/30 text-blue-300 shadow-[0_0_10px_rgba(37,99,235,0.15)]"
      }`}
      title={`Next Interstitial Ad: ${adState.nextInterstitialProvider} in ${adState.secondsUntilNextInterstitial}s`}
    >
      <Zap
        size={12}
        className={isMonetag ? "text-emerald-400 animate-pulse" : "text-blue-400 animate-pulse"}
      />
      <span>
        {adState.nextInterstitialProvider} {adState.secondsUntilNextInterstitial}s
      </span>
    </div>
  );
};

export default AdCountdownBadge;
