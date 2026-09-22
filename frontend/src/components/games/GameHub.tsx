import React from 'react';
import { ActiveGameType } from '../../types/index.js';
import { Brain, Grid2X2, Car, Sparkles, Trophy, ArrowRight, ShieldAlert, LucideIcon } from 'lucide-react';
import { TonIcon, NcIcon } from '../icons/index.js';

interface GameHubProps {
  onSelectGame: (gameType: ActiveGameType) => void;
}

interface GameCardInfo {
  type: ActiveGameType;
  title: string;
  badge: string;
  badgeColor: string;
  description: string;
  icon: LucideIcon;
  accentColor: string;
  glowClass: string;
  borderClass: string;
  ncReward: number;
  tonReward: string;
  rules: string[];
}

const ARCADE_GAMES: GameCardInfo[] = [
  {
    type: 'game_memory',
    title: 'Memory Matrix',
    badge: 'PUZZLE REFLEX',
    badgeColor: 'text-cyber-cyan bg-cyber-cyan/15 border-cyber-cyan/30',
    description: 'Find and match all 6 cryptographic symbol pairs in the 12-card matrix before the 45-second timer runs out.',
    icon: Brain,
    accentColor: 'text-cyber-cyan',
    glowClass: 'shadow-glow-cyan/20',
    borderClass: 'hover:border-cyber-cyan/60 group-hover:shadow-glow-cyan/30',
    ncReward: 45,
    tonReward: '0.000015',
    rules: ['12 Cards Grid', '45s Countdown', 'Min. 10s Anti-Cheat'],
  },
  {
    type: 'game_2048',
    title: '2048 Crypto Tile',
    badge: 'LOGIC MERGE',
    badgeColor: 'text-purple-400 bg-purple-500/15 border-purple-500/30',
    description: 'Swipe or use arrow keys to merge matching power tiles. Reach 1,000 points or highest merge to claim rewards.',
    icon: Grid2X2,
    accentColor: 'text-purple-400',
    glowClass: 'shadow-purple-500/20',
    borderClass: 'hover:border-purple-500/60 group-hover:shadow-purple-500/30',
    ncReward: 60,
    tonReward: '0.000020',
    rules: ['4x4 Matrix', 'Swipe / Arrow Keys', 'Min. 20s Anti-Cheat'],
  },
  {
    type: 'game_carrace',
    title: 'Cyber Car Race',
    badge: '3D SPEEDWAY',
    badgeColor: 'text-cyber-gold bg-cyber-gold/15 border-cyber-gold/30',
    description: 'Steer your cyber cruiser across 3 neon lanes. Avoid red traffic obstacles and collect yellow battery cells to survive 30s.',
    icon: Car,
    accentColor: 'text-cyber-gold',
    glowClass: 'shadow-glow-gold/20',
    borderClass: 'hover:border-cyber-gold/60 group-hover:shadow-glow-gold/30',
    ncReward: 50,
    tonReward: '0.000025',
    rules: ['3-Lane Highway', '30s Survival', 'Min. 28s Anti-Cheat'],
  },
];

export const GameHub: React.FC<GameHubProps> = ({ onSelectGame }) => {
  return (
    <div className="w-full flex flex-col items-center space-y-4">
      {/* Header Banner */}
      <div className="w-full flex items-center justify-between py-1">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyber-cyan via-purple-500 to-cyber-gold p-0.5 shadow-glow-cyan/40">
            <div className="w-full h-full bg-cyber-bg rounded-2xl flex items-center justify-center text-cyber-cyan">
              <Trophy size={18} />
            </div>
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">NC ARCADE ZONE</h2>
            <p className="text-[11px] font-mono text-slate-400">Play games, claim instant NC + TON</p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-cyber-card border border-cyber-border text-xs">
          <Sparkles size={13} className="text-cyber-gold" />
          <span className="font-mono text-slate-300 font-bold">3 ACTIVE</span>
        </div>
      </div>

      {/* Anti-Cheat Banner */}
      <div className="w-full bg-cyber-blue/10 border border-cyber-blue/30 rounded-xl p-2.5 flex items-center space-x-2.5 text-[11px] text-slate-300">
        <ShieldAlert size={16} className="text-cyber-blue shrink-0" />
        <span>
          Server-enforced session verification active. Complete full challenge objectives to unlock token claims.
        </span>
      </div>

      {/* Game Cards List */}
      <div className="w-full space-y-3.5">
        {ARCADE_GAMES.map((game) => {
          const IconComp = game.icon;
          return (
            <div
              key={game.type}
              className={`w-full glass-panel p-4 rounded-2xl border border-cyber-border transition-all duration-300 group ${game.borderClass} flex flex-col justify-between`}
            >
              {/* Top Row: Icon, Title, Badge */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-11 h-11 rounded-xl bg-cyber-bg/80 border border-cyber-border flex items-center justify-center ${game.accentColor} shadow-md ${game.glowClass}`}
                  >
                    <IconComp size={22} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-bold text-white tracking-wide">{game.title}</h3>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold inline-block mt-0.5 ${game.badgeColor}`}
                    >
                      {game.badge}
                    </span>
                  </div>
                </div>

                {/* Reward Pill */}
                <div className="flex flex-col items-end space-y-1">
                  <div className="flex items-center space-x-1.5 text-xs font-bold font-mono text-cyber-gold">
                    <NcIcon className="w-3.5 h-3.5" />
                    <span>+{game.ncReward} NC</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-[10px] font-mono text-cyber-cyan font-bold">
                    <TonIcon className="w-3.5 h-3.5" />
                    <span>+{game.tonReward} TON</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-300 mt-2.5 leading-relaxed font-sans">
                {game.description}
              </p>

              {/* Rules / Tags */}
              <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-cyber-border/40">
                {game.rules.map((rule, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyber-bg/60 text-slate-400 border border-cyber-border/50"
                  >
                    {rule}
                  </span>
                ))}
              </div>

              {/* Action Button */}
              <button
                onClick={() => onSelectGame(game.type)}
                className="mt-3.5 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyber-cyan/20 to-cyber-blue/20 hover:from-cyber-cyan/30 hover:to-cyber-blue/30 border border-cyber-cyan/40 hover:border-cyber-cyan text-white text-xs font-bold flex items-center justify-center space-x-2 transition-all active:scale-98 shadow-glow-cyan/20"
              >
                <span>ENTER ARENA</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
