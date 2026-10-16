import React, { useState } from 'react';
import { ActiveGameType } from '../types/index.js';
import { GameHub } from '../components/games/GameHub.js';
import { MemoryGame } from '../components/games/MemoryGame.js';
import { Game2048 } from '../components/games/Game2048.js';
import { CarRaceGame } from '../components/games/CarRaceGame.js';
import { ColorTubeSort } from '../components/games/ColorTubeSort.js';
import { adService } from '../services/adService.js';

interface GamePageProps {
  onGameFinished: (ncAwarded: number, tonAwarded: string) => void;
  userId?: number | string;
}

export const GamePage: React.FC<GamePageProps> = ({ onGameFinished, userId }) => {
  const [activeGame, setActiveGame] = useState<ActiveGameType | null>(null);

  // Start Game: Enter game mode (suppresses background 60s auto-interstitial loop)
  const handleSelectGame = (type: ActiveGameType) => {
    adService.setIsPlayingGame(true);
    setActiveGame(type);
  };

  // Finish Game: As soon as the game ends or a level completes, immediately fire queued Interstitial Ad before returning to scoreboard
  const handleLevelFinished = async (ncAwarded: number, tonAwarded: string) => {
    try {
      console.log('[GamePage] Game finished! Triggering post-game ad via adService.onGameEnd()...');
      await adService.onGameEnd();
    } catch (e) {
      console.warn('[GamePage] Interstitial ad trigger error:', e);
    } finally {
      adService.setIsPlayingGame(false);
    }
    onGameFinished(ncAwarded, tonAwarded);
  };

  // Back to Hub: If player was in a game, fire queued/post-game ad and return to hub
  const handleBackToHub = async () => {
    if (activeGame !== null) {
      try {
        await adService.onGameEnd();
      } catch (e) {
        console.warn('[GamePage] Exit game interstitial error:', e);
      } finally {
        adService.setIsPlayingGame(false);
        setActiveGame(null);
      }
    } else {
      adService.setIsPlayingGame(false);
      setActiveGame(null);
    }
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
