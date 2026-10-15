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
      className={`w-full max-w-sm rounded-2xl p-3.5 flex items-center justify-between border cursor-pointer transition active:scale-98 backdrop-blur-xl ${
        canClaim
          ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
          : "bg-slate-900/80 border-white/10 text-slate-100 shadow-lg hover:border-white/20"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
            canClaim
              ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-400 animate-pulse shadow-sm"
              : "bg-blue-500/15 border-blue-400/30 text-blue-400"
          }`}
        >
          <Calendar className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-bold text-white">Daily Streak Bonus</h4>
            <span className="text-[10px] bg-slate-950/70 border border-white/10 px-2 py-0.5 rounded font-mono text-blue-400 font-bold shadow-xs">
              Day {streak}/7
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {canClaim ? "Your daily login gift is ready to collect!" : "Next login bonus available tomorrow"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {canClaim && (
          <span className="text-[10px] bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-2.5 py-1 rounded-lg mr-1 shadow-xs">
            CLAIM
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </div>
    </div>
  );
}
