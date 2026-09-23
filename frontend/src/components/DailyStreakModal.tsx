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
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-sm p-5 text-white space-y-4 relative shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-neutral-800 text-neutral-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center pt-2 space-y-1">
          <div className="inline-flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 px-3 py-1 rounded-full text-yellow-400 text-xs font-bold font-mono">
            <Calendar className="w-3.5 h-3.5" /> STREAK: DAY {currentStreak}
          </div>
          <h3 className="text-xl font-black tracking-tight">DAILY CHECK-IN</h3>
          <p className="text-[11px] text-neutral-400">
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
                  isDay7 ? "col-span-2 aspect-auto py-3 bg-gradient-to-br from-yellow-950/40 to-neutral-900 border-yellow-500/50" : "aspect-square"
                } ${
                  isToday
                    ? "bg-yellow-500/10 border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.25)] scale-[1.02]"
                    : isClaimed
                    ? "bg-neutral-950 border-emerald-500/40 opacity-75"
                    : "bg-neutral-950/60 border-neutral-800 text-neutral-500"
                }`}
              >
                {/* Day Header */}
                <span className="text-[10px] font-bold font-mono text-neutral-400">
                  DAY {day}
                </span>

                {/* Rewards Content */}
                <div className="my-auto flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-yellow-400">
                    <NcIcon className="w-3 h-3" /> +{item.nc_reward}
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[9px] text-blue-400">
                    <TonIcon className="w-2.5 h-2.5" /> +{parseFloat(item.ton_reward).toFixed(5)}
                  </div>
                  {item.battery_bonus_pct > 0 && (
                    <span className="text-[8px] text-cyan-400 font-mono font-bold flex items-center gap-0.5">
                      <Zap className="w-2.5 h-2.5" /> +{item.battery_bonus_pct}%
                    </span>
                  )}
                </div>

                {/* State Badge */}
                {isClaimed ? (
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                ) : isToday ? (
                  <span className="text-[8px] bg-yellow-400 text-black font-extrabold px-1.5 rounded-md">
                    READY
                  </span>
                ) : (
                  <Lock className="w-3 h-3 text-neutral-600" />
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
              ? "bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black shadow-lg shadow-yellow-500/20"
              : "bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700/50"
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
