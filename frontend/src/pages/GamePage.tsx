import React, { useState } from 'react';
import { ActiveGameType } from '../types/index.js';
import { GameHub } from '../components/games/GameHub.js';
import { MemoryGame } from '../components/games/MemoryGame.js';
import { Game2048 } from '../components/games/Game2048.js';
import { CarRaceGame } from '../components/games/CarRaceGame.js';
import { useAdManager, setGameActiveState } from '../hooks/useAdManager.js';
import { Loader2 } from 'lucide-react';

interface GamePageProps {
  onGameFinished: (ncAwarded: number, tonAwarded: string) => void;
  userId?: number | string;
}

export const GamePage: React.FC<GamePageProps> = ({ onGameFinished, userId }) => {
  const [activeGame, setActiveGame] = useState<ActiveGameType | null>(null);
  const [isPreparingGame, setIsPreparingGame] = useState<boolean>(false);
  const { showPreGameAd } = useAdManager(userId || '');

  const handleSelectGame = async (type: ActiveGameType) => {
    setIsPreparingGame(true);
    try {
      // 1. Show ad BEFORE game start
      await showPreGameAd();
    } catch (err) {
      console.warn('[GamePage] Pre-game ad skipped or failed:', err);
    } finally {
      setIsPreparingGame(false);
      setActiveGame(type);
    }
  };

  const handleBackToHub = () => {
    setGameActiveState(false);
    setActiveGame(null);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto px-4 pb-24 pt-2">
      {/* Pre-Game Ad Loading Indicator */}
      {isPreparingGame && (
        <div className="w-full h-80 flex flex-col items-center justify-center glass-panel rounded-2xl border border-cyber-cyan/40 text-center p-6 my-auto">
          <div className="w-14 h-14 rounded-2xl bg-cyber-cyan/20 border border-cyber-cyan text-cyber-cyan flex items-center justify-center mx-auto mb-3 shadow-glow-cyan animate-pulse">
            <Loader2 size={28} className="animate-spin" />
          </div>
          <h3 className="text-sm font-bold text-white tracking-wider">ENTERING ARENA</h3>
          <p className="text-xs font-mono text-slate-400 mt-1">Preparing session telemetry, get ready...</p>
        </div>
      )}

      {/* Hub Lobby */}
      {!isPreparingGame && activeGame === null && (
        <GameHub onSelectGame={handleSelectGame} />
      )}

      {/* Memory Matrix */}
      {activeGame === 'game_memory' && (
        <MemoryGame
          onBack={handleBackToHub}
          onFinished={onGameFinished}
          userId={userId}
        />
      )}

      {/* 2048 Crypto Tile */}
      {activeGame === 'game_2048' && (
        <Game2048
          onBack={handleBackToHub}
          onFinished={onGameFinished}
          userId={userId}
        />
      )}

      {/* Cyber Car Race */}
      {activeGame === 'game_carrace' && (
        <CarRaceGame
          onBack={handleBackToHub}
          onFinished={onGameFinished}
          userId={userId}
        />
      )}
    </div>
  );
};
