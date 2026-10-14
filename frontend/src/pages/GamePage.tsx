import React, { useState } from 'react';
import { ActiveGameType } from '../types/index.js';
import { GameHub } from '../components/games/GameHub.js';
import { MemoryGame } from '../components/games/MemoryGame.js';
import { Game2048 } from '../components/games/Game2048.js';
import { CarRaceGame } from '../components/games/CarRaceGame.js';
import { ColorTubeSort } from '../components/games/ColorTubeSort.js';
import { useAdManager, setGameActiveState } from '../hooks/useAdManager.js';
import { triggerAlternatingInterstitial } from '../services/adManager.js';
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

  const handleLevelFinished = async (ncAwarded: number, tonAwarded: string) => {
    try {
      // 1:1 Alternating Interstitial Ad triggered upon level completion
      await triggerAlternatingInterstitial(true);
    } catch (e) {
      console.warn('[GamePage] Interstitial ad trigger error:', e);
    }
    onGameFinished(ncAwarded, tonAwarded);
  };

  const handleBackToHub = () => {
    setGameActiveState(false);
    setActiveGame(null);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto px-4 pb-24 pt-2">
      {/* Pre-Game Ad Loading Indicator */}
      {isPreparingGame && (
        <div className="w-full h-80 flex flex-col items-center justify-center bg-white rounded-2xl border border-[#E2E8F0] text-center p-6 my-auto shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] border border-blue-200 text-[#2563EB] flex items-center justify-center mx-auto mb-3 shadow-xs animate-pulse">
            <Loader2 size={28} className="animate-spin" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 tracking-wider">ENTERING ARENA</h3>
          <p className="text-xs font-mono text-slate-500 mt-1">Preparing session telemetry, get ready...</p>
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
          onFinished={handleLevelFinished}
          userId={userId}
        />
      )}

      {/* 2048 Crypto Tile */}
      {activeGame === 'game_2048' && (
        <Game2048
          onBack={handleBackToHub}
          onFinished={handleLevelFinished}
          userId={userId}
        />
      )}

      {/* Cyber Car Race */}
      {activeGame === 'game_carrace' && (
        <CarRaceGame
          onBack={handleBackToHub}
          onFinished={handleLevelFinished}
          userId={userId}
        />
      )}

      {/* Color Tube Sort */}
      {activeGame === 'game_tubesort' && (
        <ColorTubeSort
          onBack={handleBackToHub}
          onFinished={handleLevelFinished}
          onGameComplete={() => handleLevelFinished(55, '0.000020')}
          userId={userId}
        />
      )}
    </div>
  );
};
