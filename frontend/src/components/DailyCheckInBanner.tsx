import { Calendar, ChevronRight } from "lucide-react";

interface DailyBannerProps {
  streak: number;
  canClaim: boolean;
  onClick: () => void;
}

export default function DailyCheckInBanner({ streak, canClaim, onClick }: DailyBannerProps) {
  return (
    <div
      onClick={onClick}
      className={`w-full max-w-sm rounded-2xl p-3.5 flex items-center justify-between border cursor-pointer transition active:scale-98 ${
        canClaim
          ? "bg-gradient-to-r from-yellow-950/40 via-neutral-900 to-neutral-900 border-yellow-500/40 shadow-lg shadow-yellow-500/10"
          : "bg-neutral-900 border-neutral-800 text-neutral-400"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
            canClaim
              ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-400 animate-pulse"
              : "bg-neutral-800 border-neutral-700 text-neutral-500"
          }`}
        >
          <Calendar className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-bold text-white">Daily Streak Bonus</h4>
            <span className="text-[10px] bg-neutral-800 px-2 py-0.2 rounded font-mono text-yellow-400 font-semibold">
              Day {streak}/7
            </span>
          </div>
          <p className="text-[10px] text-neutral-400 mt-0.5">
            {canClaim ? "Your daily login gift is ready to collect!" : "Next login bonus available tomorrow"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {canClaim && (
          <span className="text-[10px] bg-yellow-400 text-black font-extrabold px-2 py-0.5 rounded-lg mr-1">
            CLAIM
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-neutral-500" />
      </div>
    </div>
  );
}
