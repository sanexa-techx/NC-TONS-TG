import { useState } from "react";
import WebApp from "@twa-dev/sdk";
import { Calendar, Check, Lock, Sparkles, X, Zap } from "lucide-react";
import TonIcon from "./icons/TonIcon";
import NcIcon from "./icons/NcIcon";

interface DailyStreakModalProps {
  userId: number | string;
  statusData: {
    currentStreak: number;
    canClaim: boolean;
    nextStreak: number;
    ladder: Array<{
      day_number: number;
      nc_reward: number;
      ton_reward: string;
      battery_bonus_pct: number;
    }>;
  };
  onClose: () => void;
  onClaimSuccess: (newBalances: any, reward: any) => void;
}

export default function DailyStreakModal({
  userId,
  statusData,
  onClose,
  onClaimSuccess,
}: DailyStreakModalProps) {
  const [loading, setLoading] = useState(false);
  const { currentStreak, canClaim, nextStreak, ladder } = statusData;

  const handleClaim = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/daily/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();

      if (res.ok) {
        try {
          if (WebApp?.HapticFeedback) {
            WebApp.HapticFeedback.notificationOccurred("success");
          }
        } catch (e) {
          // ignore when outside telegram client
        }
        onClaimSuccess(data.updatedBalances, data.reward);
        onClose();
      } else {
        alert(data.error || "Failed to claim reward");
      }
    } catch (err) {
      console.error("Daily claim error:", err);
      alert("Failed to claim reward");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900/95 border border-white/15 rounded-3xl w-full max-w-sm p-5 text-slate-100 space-y-4 relative shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-950/70 border border-white/10 text-slate-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center pt-2 space-y-1">
          <div className="inline-flex items-center gap-1.5 bg-blue-500/15 border border-blue-400/30 px-3 py-1 rounded-full text-blue-300 text-xs font-bold font-mono">
            <Calendar className="w-3.5 h-3.5" /> STREAK: DAY {currentStreak}
          </div>
          <h3 className="text-xl font-black text-white tracking-tight">DAILY CHECK-IN</h3>
          <p className="text-[11px] text-slate-400">
            Log in consecutive days to reach the Day 7 TON & Fuel Jackpot!
          </p>
        </div>

        {/* 7-Day Road Grid */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          {ladder.map((item) => {
            const day = item.day_number;
            const isClaimed = canClaim ? day < nextStreak : day <= currentStreak;
            const isToday = canClaim && day === nextStreak;
            const isDay7 = day === 7;

            return (
              <div
                key={day}
                className={`rounded-2xl p-2.5 flex flex-col items-center justify-between text-center relative border transition-all ${
                  isDay7 ? "col-span-2 aspect-auto py-3 bg-gradient-to-br from-blue-950/40 to-emerald-950/40 border-blue-400/40" : "aspect-square"
                } ${
                  isToday
                    ? "bg-emerald-950/50 border-2 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)] scale-[1.02]"
                    : isClaimed
                    ? "bg-slate-950/60 border-emerald-500/30 opacity-70"
                    : "bg-slate-950/70 border-white/10 text-slate-400"
                }`}
              >
                {/* Day Header */}
                <span className="text-[10px] font-bold font-mono text-slate-400">
                  DAY {day}
                </span>

                {/* Rewards Content */}
                <div className="my-auto flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-emerald-400">
                    <NcIcon className="w-3 h-3" /> +{item.nc_reward}
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[9px] text-blue-400 font-bold">
                    <TonIcon className="w-2.5 h-2.5" /> +{parseFloat(item.ton_reward).toFixed(5)}
                  </div>
                  {item.battery_bonus_pct > 0 && (
                    <span className="text-[8px] text-blue-400 font-mono font-bold flex items-center gap-0.5">
                      <Zap className="w-2.5 h-2.5" /> +{item.battery_bonus_pct}%
                    </span>
                  )}
                </div>

                {/* State Badge */}
                {isClaimed ? (
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                ) : isToday ? (
                  <span className="text-[8px] bg-emerald-500 text-slate-950 font-black px-1.5 py-0.5 rounded-md shadow-2xs">
                    READY
                  </span>
                ) : (
                  <Lock className="w-3 h-3 text-slate-500" />
                )}
              </div>
            );
          })}
        </div>

        {/* Claim Action Button */}
        <button
          onClick={handleClaim}
          disabled={!canClaim || loading}
          className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition active:scale-98 ${
            canClaim
              ? "bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer"
              : "bg-slate-950/60 text-slate-500 cursor-not-allowed border border-white/10"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          {loading
            ? "Claiming Bonus..."
            : canClaim
            ? `Claim Day ${nextStreak} Reward`
            : "Come Back Tomorrow!"}
        </button>
      </div>
    </div>
  );
}
