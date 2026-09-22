import React from 'react';
import { DropGameCanvas } from '../components/DropGameCanvas.js';
import { Sparkles } from 'lucide-react';

interface GamePageProps {
  onGameFinished: (ncAwarded: number, tonAwarded: string) => void;
}

export const GamePage: React.FC<GamePageProps> = ({ onGameFinished }) => {
  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto px-4 pb-24 pt-2">
      <div className="w-full flex items-center justify-between py-2 mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-cyber-cyan/20 flex items-center justify-center text-cyber-cyan">
            <Sparkles size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Drop Catcher Arena</h2>
            <p className="text-[11px] text-slate-400">30-second reflex challenge</p>
          </div>
        </div>

        <div className="text-[11px] font-mono px-2.5 py-1 rounded-xl bg-cyber-gold/15 text-cyber-gold border border-cyber-gold/30 font-bold">
          DUAL BOUNTIES
        </div>
      </div>

      <DropGameCanvas onGameFinished={onGameFinished} />

      {/* Rules Card */}
      <div className="w-full glass-panel p-3.5 rounded-2xl border border-cyber-border mt-4 text-xs">
        <div className="font-bold text-slate-300 mb-2">Game Mechanics & Payouts:</div>
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          <div className="bg-cyber-bg/60 p-2 rounded-xl border border-cyber-gold/20 flex flex-col items-center text-center">
            <span className="text-cyber-gold font-bold">🟡 Gold Coin</span>
            <span className="text-slate-400 mt-1">+10 NC Coins</span>
          </div>
          <div className="bg-cyber-bg/60 p-2 rounded-xl border border-cyber-cyan/20 flex flex-col items-center text-center">
            <span className="text-cyber-cyan font-bold">🔷 Cyan Gem</span>
            <span className="text-slate-400 mt-1">+25 NC + TON</span>
          </div>
          <div className="bg-cyber-bg/60 p-2 rounded-xl border border-cyber-red/20 flex flex-col items-center text-center">
            <span className="text-cyber-red font-bold">❌ Red Hazard</span>
            <span className="text-slate-400 mt-1">-15 NC Penalty</span>
          </div>
        </div>
      </div>
    </div>
  );
};
