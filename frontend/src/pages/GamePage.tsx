import React, { useState } from 'react';
import { ActiveGameType } from '../types/index.js';
import { GameHub } from '../components/games/GameHub.js';
import { MemoryGame } from '../components/games/MemoryGame.js';
import { Game2048 } from '../components/games/Game2048.js';
import { CarRaceGame } from '../components/games/CarRaceGame.js';
import { useAdManager } from '../hooks/useAdManager.js';

interface GamePageProps {
  onGameFinished: (ncAwarded: number, tonAwarded: string) => void;
  userId?: number | string;
}

export const GamePage: React.FC<GamePageProps> = ({ onGameFinished, userId }) => {
  const [activeGame, setActiveGame] = useState<ActiveGameType | null>(null);
  const { triggerInterstitial } = useAdManager(userId || '9990001');

  const handleSelectGame = (type: ActiveGameType) => {
    triggerInterstitial('start');
    setActiveGame(type);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto px-4 pb-24 pt-2">
      {/* Hub Lobby */}
      {activeGame === null && (
        <GameHub onSelectGame={handleSelectGame} />
      )}

      {/* Memory Matrix */}
      {activeGame === 'game_memory' && (
        <MemoryGame
          onBack={() => setActiveGame(null)}
          onFinished={onGameFinished}
        />
      )}

      {/* 2048 Crypto Tile */}
      {activeGame === 'game_2048' && (
        <Game2048
          onBack={() => setActiveGame(null)}
          onFinished={onGameFinished}
        />
      )}

      {/* Cyber Car Race */}
      {activeGame === 'game_carrace' && (
        <CarRaceGame
          onBack={() => setActiveGame(null)}
          onFinished={onGameFinished}
        />
      )}
    </div>
  );
};
