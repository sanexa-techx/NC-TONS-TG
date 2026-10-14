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
          ? "bg-[#ECFDF5] border-emerald-300 text-slate-800 shadow-sm"
          : "bg-white border-[#E2E8F0] text-slate-600 shadow-xs hover:border-slate-300"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
            canClaim
              ? "bg-[#10B981] border-emerald-400 text-white animate-pulse shadow-sm"
              : "bg-[#EFF6FF] border-blue-100 text-[#2563EB]"
          }`}
        >
          <Calendar className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-bold text-slate-900">Daily Streak Bonus</h4>
            <span className="text-[10px] bg-white border border-[#E2E8F0] px-2 py-0.5 rounded font-mono text-[#2563EB] font-bold shadow-2xs">
              Day {streak}/7
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {canClaim ? "Your daily login gift is ready to collect!" : "Next login bonus available tomorrow"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {canClaim && (
          <span className="text-[10px] bg-[#10B981] text-white font-extrabold px-2.5 py-1 rounded-lg mr-1 shadow-xs">
            CLAIM
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </div>
    </div>
  );
}
