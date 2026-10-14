import React from 'react';
import { ActiveGameType } from '../../types/index.js';
import { Brain, Grid2X2, Car, TestTubes, Sparkles, Trophy, ArrowRight, ShieldAlert } from 'lucide-react';
import { TonIcon, NcIcon } from '../icons/index.js';

interface GameHubProps {
  onSelectGame: (gameType: ActiveGameType) => void;
}

export const GameHub: React.FC<GameHubProps> = ({ onSelectGame }) => {
  return (
    <div className="w-full flex flex-col items-center space-y-3.5 pb-4">
      {/* Header Banner */}
      <div className="w-full flex items-center justify-between py-1">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-2xl bg-[#EFF6FF] border border-blue-200 flex items-center justify-center text-[#2563EB] shadow-xs">
            <Trophy size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-wide">NC ARCADE ZONE</h2>
            <p className="text-[11px] font-mono text-slate-500">Play games, claim instant NC + TON</p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-white border border-[#E2E8F0] text-xs shadow-2xs">
          <Sparkles size={13} className="text-[#10B981]" />
          <span className="font-mono text-slate-700 font-bold">3 ARENAS ACTIVE</span>
        </div>
      </div>

      {/* Anti-Cheat Banner */}
      <div className="w-full bg-[#EFF6FF] border border-blue-200 rounded-xl p-2.5 flex items-center space-x-2.5 text-[11px] text-blue-900 shadow-2xs">
        <ShieldAlert size={16} className="text-[#2563EB] shrink-0" />
        <span>
          Server-enforced session verification active. Complete challenges to trigger reward payouts.
        </span>
      </div>

      {/* FEATURED: Dark-Navy Card for "COLOR TUBE SORT" */}
      <div className="w-full bg-[#0A1128] border border-slate-700/80 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden group">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#10B981]/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#2563EB]/20 rounded-full blur-2xl pointer-events-none" />

        {/* Top Badges & Rewards */}
        <div className="flex items-center justify-between relative z-10 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] font-bold">
              FEATURED
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-400/30 text-blue-300 font-semibold">
              LOGIC SORT
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs font-mono font-bold text-[#10B981]">
              <NcIcon className="w-3.5 h-3.5" />
              <span>+55 NC</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-blue-300">
              <TonIcon className="w-3.5 h-3.5" />
              <span>+0.000020 TON</span>
            </div>
          </div>
        </div>

        {/* Title & Description */}
        <div className="relative z-10 mb-3">
          <h3 className="text-base font-black tracking-wide text-white flex items-center gap-2">
            <TestTubes className="w-4 h-4 text-[#10B981]" />
            COLOR TUBE SORT
          </h3>
          <p className="text-[11px] text-slate-300 leading-relaxed font-sans mt-0.5">
            Segregate mixed chemical isotopes into matching color flasks before the 60s timer expires.
          </p>
        </div>

        {/* 4 Vertical Glass Test Tubes Display */}
        <div className="relative z-10 py-3 px-4 bg-white/[0.04] rounded-xl border border-white/10 my-3 flex items-end justify-center gap-5">
          {/* Tube 1 */}
          <div className="flex flex-col items-center">
            <div className="w-8 h-22 rounded-b-2xl rounded-t-sm border-2 border-white/40 bg-white/5 backdrop-blur-xs relative overflow-hidden flex flex-col justify-end p-0.5 shadow-inner">
              <div className="absolute top-0 left-1 w-0.5 h-full bg-white/30 rounded-full" />
              <div className="h-4 w-full bg-[#8B5CF6] rounded-t-xs mb-0.5" />
              <div className="h-4 w-full bg-[#F59E0B] mb-0.5" />
              <div className="h-4 w-full bg-[#2563EB] mb-0.5" />
              <div className="h-5 w-full bg-[#10B981] rounded-b-xl" />
            </div>
            <span className="text-[9px] font-mono text-slate-400 mt-1">Tube 1</span>
          </div>

          {/* Tube 2 */}
          <div className="flex flex-col items-center">
            <div className="w-8 h-22 rounded-b-2xl rounded-t-sm border-2 border-white/40 bg-white/5 backdrop-blur-xs relative overflow-hidden flex flex-col justify-end p-0.5 shadow-inner">
              <div className="absolute top-0 left-1 w-0.5 h-full bg-white/30 rounded-full" />
              <div className="h-4 w-full bg-[#10B981] rounded-t-xs mb-0.5" />
              <div className="h-4 w-full bg-[#10B981] mb-0.5" />
              <div className="h-4 w-full bg-[#8B5CF6] mb-0.5" />
              <div className="h-5 w-full bg-[#2563EB] rounded-b-xl" />
            </div>
            <span className="text-[9px] font-mono text-slate-400 mt-1">Tube 2</span>
          </div>

          {/* Tube 3 */}
          <div className="flex flex-col items-center">
            <div className="w-8 h-22 rounded-b-2xl rounded-t-sm border-2 border-white/40 bg-white/5 backdrop-blur-xs relative overflow-hidden flex flex-col justify-end p-0.5 shadow-inner">
              <div className="absolute top-0 left-1 w-0.5 h-full bg-white/30 rounded-full" />
              <div className="h-4 w-full bg-[#F59E0B] rounded-t-xs mb-0.5" />
              <div className="h-4 w-full bg-[#2563EB] mb-0.5" />
              <div className="h-4 w-full bg-[#F59E0B] mb-0.5" />
              <div className="h-5 w-full bg-[#8B5CF6] rounded-b-xl" />
            </div>
            <span className="text-[9px] font-mono text-slate-400 mt-1">Tube 3</span>
          </div>

          {/* Tube 4 (Buffer / Empty top) */}
          <div className="flex flex-col items-center">
            <div className="w-8 h-22 rounded-b-2xl rounded-t-sm border-2 border-white/40 bg-white/5 backdrop-blur-xs relative overflow-hidden flex flex-col justify-end p-0.5 shadow-inner">
              <div className="absolute top-0 left-1 w-0.5 h-full bg-white/30 rounded-full" />
              <div className="h-4 w-full bg-[#2563EB] rounded-t-xs mb-0.5 opacity-90" />
              <div className="h-5 w-full bg-[#10B981] rounded-b-xl" />
            </div>
            <span className="text-[9px] font-mono text-emerald-400 mt-1">Buffer</span>
          </div>
        </div>

        {/* Solid Neo-Mint Button */}
        <button
          onClick={() => onSelectGame('game_tubesort')}
          className="relative z-10 w-full py-3 px-4 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all active:scale-98 shadow-md shadow-emerald-500/25 cursor-pointer"
        >
          <span>PLAY COLOR TUBE SORT</span>
          <ArrowRight size={15} />
        </button>
      </div>

      {/* 2-COLUMN GRID: "Memory Matrix" & "Cyber Car Race" */}
      <div className="w-full grid grid-cols-2 gap-3">
        {/* Game 1: Memory Matrix */}
        <div className="bg-white p-3.5 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col justify-between hover:border-blue-300 transition-all">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] border border-blue-200 flex items-center justify-center text-[#2563EB]">
                <Brain size={18} />
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#EFF6FF] border border-blue-200 text-[#2563EB] font-bold">
                REFLEX
              </span>
            </div>

            <h4 className="text-xs font-black text-slate-900 tracking-tight">Memory Matrix</h4>
            <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
              Match 6 cryptographic pairs in 45s.
            </p>

            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono">
              <span className="text-[#10B981] font-bold">+45 NC</span>
              <span className="text-[#2563EB] font-bold">+0.000015 TON</span>
            </div>
          </div>

          <button
            onClick={() => onSelectGame('game_memory')}
            className="mt-3 w-full py-2 px-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-[11px] font-extrabold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition active:scale-98 cursor-pointer shadow-xs"
          >
            <span>PLAY MATRIX</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {/* Game 2: Cyber Car Race */}
        <div className="bg-white p-3.5 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-all">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-[#ECFDF5] border border-emerald-200 flex items-center justify-center text-[#10B981]">
                <Car size={18} />
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#ECFDF5] border border-emerald-200 text-[#10B981] font-bold">
                SPEEDWAY
              </span>
            </div>

            <h4 className="text-xs font-black text-slate-900 tracking-tight">Cyber Car Race</h4>
            <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
              3-lane highway, avoid obstacles for 30s.
            </p>

            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono">
              <span className="text-[#10B981] font-bold">+50 NC</span>
              <span className="text-[#2563EB] font-bold">+0.000025 TON</span>
            </div>
          </div>

          <button
            onClick={() => onSelectGame('game_carrace')}
            className="mt-3 w-full py-2 px-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-[11px] font-extrabold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition active:scale-98 cursor-pointer shadow-xs"
          >
            <span>PLAY RACE</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* Bonus Arena: 2048 Crypto Tile */}
      <div className="w-full bg-white p-3 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
            <Grid2X2 size={16} />
          </div>
          <div>
            <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>2048 Crypto Tile</span>
              <span className="text-[9px] font-mono text-purple-700 bg-purple-50 border border-purple-200 px-1 rounded">
                +60 NC • TON
              </span>
            </h5>
            <p className="text-[10px] text-slate-400 font-mono">Swipe to merge 1,000 pts</p>
          </div>
        </div>

        <button
          onClick={() => onSelectGame('game_2048')}
          className="py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition active:scale-95 cursor-pointer"
        >
          Play 2048
        </button>
      </div>
    </div>
  );
};
