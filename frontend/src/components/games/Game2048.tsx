import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../services/api.js';
import { useTelegram } from '../../hooks/useTelegram.js';
import { ArrowLeft, RotateCcw, Award, CheckCircle2, AlertCircle, Loader2, Sparkles, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';
import { TonIcon, NcIcon } from '../icons/index.js';

interface Game2048Props {
  onBack: () => void;
  onFinished: (ncAwarded: number, tonAwarded: string) => void;
}

type Board = number[][];

const BOARD_SIZE = 4;

function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
}

function spawnRandomTile(board: Board): Board {
  const newBoard = board.map((row) => [...row]);
  const emptyCoords: [number, number][] = [];

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (newBoard[r][c] === 0) {
        emptyCoords.push([r, c]);
      }
    }
  }

  if (emptyCoords.length === 0) return newBoard;

  const [randR, randC] = emptyCoords[Math.floor(Math.random() * emptyCoords.length)];
  newBoard[randR][randC] = Math.random() < 0.85 ? 2 : 4;
  return newBoard;
}

function slideRow(row: number[]): { newRow: number[]; scoreGained: number } {
  const filtered = row.filter((val) => val !== 0);
  const newRow: number[] = [];
  let scoreGained = 0;

  for (let i = 0; i < filtered.length; i++) {
    if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
      const mergedVal = filtered[i] * 2;
      newRow.push(mergedVal);
      scoreGained += mergedVal;
      i++; // Skip next element because it was merged
    } else {
      newRow.push(filtered[i]);
    }
  }

  while (newRow.length < BOARD_SIZE) {
    newRow.push(0);
  }

  return { newRow, scoreGained };
}

function rotateBoard(board: Board): Board {
  const newBoard = createEmptyBoard();
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      newBoard[c][BOARD_SIZE - 1 - r] = board[r][c];
    }
  }
  return newBoard;
}

function hasMovesLeft(board: Board): boolean {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 0) return true;
      if (r < BOARD_SIZE - 1 && board[r][c] === board[r + 1][c]) return true;
      if (c < BOARD_SIZE - 1 && board[r][c] === board[r][c + 1]) return true;
    }
  }
  return false;
}

// Cyberpunk tile styling based on value
function getTileStyle(val: number): { bg: string; text: string; shadow: string } {
  switch (val) {
    case 2:
      return { bg: 'bg-slate-800/80 border-slate-700', text: 'text-slate-200', shadow: '' };
    case 4:
      return { bg: 'bg-cyan-950/70 border-cyan-800', text: 'text-cyan-300', shadow: 'shadow-sm' };
    case 8:
      return { bg: 'bg-cyan-900/80 border-cyan-500', text: 'text-cyan-200', shadow: 'shadow-glow-cyan/30' };
    case 16:
      return { bg: 'bg-blue-900/80 border-blue-500', text: 'text-blue-200', shadow: 'shadow-glow-blue/40' };
    case 32:
      return { bg: 'bg-indigo-900/80 border-indigo-400', text: 'text-indigo-200', shadow: 'shadow-glow-blue/50' };
    case 64:
      return { bg: 'bg-purple-900/80 border-purple-400', text: 'text-purple-200', shadow: 'shadow-purple-500/50' };
    case 128:
      return { bg: 'bg-fuchsia-900/80 border-fuchsia-400', text: 'text-fuchsia-200 font-bold', shadow: 'shadow-fuchsia-500/60' };
    case 256:
      return { bg: 'bg-amber-900/80 border-amber-400', text: 'text-amber-200 font-bold', shadow: 'shadow-glow-gold/60' };
    case 512:
      return { bg: 'bg-yellow-800/90 border-yellow-300', text: 'text-yellow-100 font-extrabold', shadow: 'shadow-glow-gold/80' };
    case 1024:
      return { bg: 'bg-emerald-900/90 border-emerald-400', text: 'text-emerald-100 font-black text-xl', shadow: 'shadow-emerald-500/80' };
    case 2048:
      return { bg: 'bg-gradient-to-tr from-cyber-cyan to-cyber-gold border-white', text: 'text-slate-950 font-black text-xl animate-pulse', shadow: 'shadow-glow-cyan' };
    default:
      return { bg: 'bg-slate-900/90 border-cyber-border', text: 'text-white font-black', shadow: '' };
  }
}

export const Game2048: React.FC<Game2048Props> = ({ onBack, onFinished }) => {
  const { haptic } = useTelegram();
  const [board, setBoard] = useState<Board>(createEmptyBoard);
  const [score, setScore] = useState<number>(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<'loading' | 'playing' | 'gameover' | 'submitting' | 'claimed'>('loading');
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [rewardClaim, setRewardClaim] = useState<{ nc: number; ton: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const startTimeRef = useRef<number>(Date.now());
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const timerRef = useRef<any>(null);

  // Initialize Game Session
  const initGame = useCallback(async () => {
    try {
      setGameState('loading');
      setErrorMsg(null);
      setRewardClaim(null);
      setScore(0);
      setElapsedSec(0);

      // Start board with 2 tiles
      let initialBoard = createEmptyBoard();
      initialBoard = spawnRandomTile(initialBoard);
      initialBoard = spawnRandomTile(initialBoard);
      setBoard(initialBoard);

      const res = await api.startGame('game_2048');
      setSessionId(res.sessionId);
      startTimeRef.current = Date.now();
      setGameState('playing');
    } catch (err) {
      setErrorMsg((err as Error).message || 'Failed to start game session');
      setGameState('gameover');
    }
  }, []);

  useEffect(() => {
    initGame();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [initGame]);

  // Track elapsed seconds
  useEffect(() => {
    if (gameState !== 'playing') return;

    timerRef.current = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  // Submit finish round
  const handleFinishRound = useCallback(async () => {
    if (!sessionId || (gameState !== 'playing' && gameState !== 'gameover')) return;
    setGameState('submitting');
    haptic('success');

    try {
      // Anti-cheat requirement: Minimum 20 seconds
      const currentElapsed = (Date.now() - startTimeRef.current) / 1000;
      if (currentElapsed < 20.5) {
        const waitMs = Math.ceil((20.5 - currentElapsed) * 1000);
        await new Promise((r) => setTimeout(r, waitMs));
      }

      confetti({
        particleCount: 55,
        spread: 70,
        origin: { y: 0.6 },
      });

      const res = await api.finishGame(sessionId, score);
      const nc = res.reward?.nc ?? res.ncAwarded ?? 60;
      const ton = res.reward?.ton ?? res.tonAwarded ?? '0.000020';

      setRewardClaim({ nc, ton });
      setGameState('claimed');
      onFinished(nc, ton);
    } catch (err) {
      setErrorMsg((err as Error).message || 'Session verification failed');
      setGameState('gameover');
      haptic('error');
    }
  }, [sessionId, score, gameState, onFinished, haptic]);

  // Check 1000 score threshold auto-claim trigger
  useEffect(() => {
    if (score >= 1000 && gameState === 'playing') {
      handleFinishRound();
    }
  }, [score, gameState, handleFinishRound]);

  // Board Move Logic (Left, Right, Up, Down)
  const move = useCallback(
    (direction: 'left' | 'right' | 'up' | 'down') => {
      if (gameState !== 'playing') return;

      let rotatedBoard = board.map((r) => [...r]);
      let rotations = 0;

      if (direction === 'up') {
        rotations = 3;
        rotatedBoard = rotateBoard(rotateBoard(rotateBoard(rotatedBoard)));
      } else if (direction === 'right') {
        rotations = 2;
        rotatedBoard = rotateBoard(rotateBoard(rotatedBoard));
      } else if (direction === 'down') {
        rotations = 1;
        rotatedBoard = rotateBoard(rotatedBoard);
      }

      let boardChanged = false;
      let addedScore = 0;

      const newSlidBoard = rotatedBoard.map((row) => {
        const { newRow, scoreGained } = slideRow(row);
        if (scoreGained > 0) addedScore += scoreGained;
        if (newRow.some((val, idx) => val !== row[idx])) {
          boardChanged = true;
        }
        return newRow;
      });

      // Rotate board back to normal
      let finalBoard = newSlidBoard;
      const reverseRotations = (4 - rotations) % 4;
      for (let i = 0; i < reverseRotations; i++) {
        finalBoard = rotateBoard(finalBoard);
      }

      if (boardChanged) {
        haptic(addedScore > 0 ? 'medium' : 'light');
        const boardWithSpawn = spawnRandomTile(finalBoard);
        setBoard(boardWithSpawn);
        setScore((prev) => prev + addedScore);

        // Check if game over (no moves left)
        if (!hasMovesLeft(boardWithSpawn)) {
          haptic('warning');
          setGameState('gameover');
        }
      }
    },
    [board, gameState, haptic]
  );

  // Keyboard controls for desktop & dev preview testing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        move('left');
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        move('right');
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        move('up');
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        move('down');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move, gameState]);

  // Touch Swipe Handlers for Telegram Mini App Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (gameState !== 'playing') return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || gameState !== 'playing') return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    const minSwipeDistance = 30;
    if (Math.abs(deltaX) < minSwipeDistance && Math.abs(deltaY) < minSwipeDistance) {
      return;
    }

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (deltaX > 0) move('right');
      else move('left');
    } else {
      // Vertical swipe
      if (deltaY > 0) move('down');
      else move('up');
    }
  };

  return (
    <div className="w-full flex flex-col items-center select-none">
      {/* Top Bar: Navigation & Score Display */}
      <div className="w-full flex items-center justify-between py-2 mb-3">
        <button
          onClick={onBack}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyber-card border border-cyber-border text-xs text-slate-300 hover:text-white transition-all active:scale-95"
        >
          <ArrowLeft size={14} />
          <span>HUB</span>
        </button>

        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-1 px-3 py-1 rounded-xl bg-cyber-bg border border-cyber-border font-mono text-xs">
            <span className="text-slate-400">TIME:</span>
            <span className="text-cyber-cyan font-bold">{elapsedSec}s</span>
          </div>

          <div className="flex items-center space-x-1 px-3 py-1 rounded-xl bg-cyber-card border border-cyber-border font-mono text-xs">
            <Trophy size={13} className="text-cyber-gold" />
            <span className="text-slate-400">SCORE:</span>
            <span className="text-cyber-gold font-bold">{score}</span>
          </div>
        </div>
      </div>

      {/* Target Progress Bar */}
      <div className="w-full glass-panel p-2.5 rounded-xl border border-cyber-border mb-3 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1.5">
          <Sparkles size={14} className="text-purple-400" />
          <span className="font-mono text-slate-300 text-[11px]">TARGET: 1,000 PTS OR MERGE LIMIT</span>
        </div>
        <div className="text-xs font-mono text-purple-400 font-bold">
          {Math.min(100, Math.round((score / 1000) * 100))}%
        </div>
      </div>

      {/* Loading State */}
      {gameState === 'loading' && (
        <div className="w-full h-80 flex flex-col items-center justify-center glass-panel rounded-2xl border border-cyber-border">
          <Loader2 size={32} className="animate-spin text-purple-400 mb-3" />
          <p className="text-xs font-mono text-slate-300">INITIALIZING 2048 TILE REGISTRY...</p>
        </div>
      )}

      {/* Submitting State */}
      {gameState === 'submitting' && (
        <div className="w-full h-80 flex flex-col items-center justify-center glass-panel rounded-2xl border border-cyber-border text-center p-4">
          <Loader2 size={36} className="animate-spin text-cyber-gold mb-3" />
          <h3 className="text-sm font-bold text-white tracking-wide">VALIDATING MERGE PROOF</h3>
          <p className="text-xs font-mono text-slate-400 mt-1">Verifying cryptographic tile score on nodes...</p>
        </div>
      )}

      {/* Playing Board */}
      {(gameState === 'playing' || gameState === 'gameover' || gameState === 'claimed') && (
          <div className="w-full flex flex-col items-center">
            {/* 4x4 Grid Container */}
            <div
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="w-full max-w-sm aspect-square p-2.5 rounded-2xl bg-cyber-bg/90 border-2 border-cyber-border shadow-2xl grid grid-cols-4 gap-2 touch-none relative"
            >
              {board.map((row, r) =>
                row.map((val, c) => {
                  const style = getTileStyle(val);
                  return (
                    <div
                      key={`${r}-${c}`}
                      className={`w-full h-full rounded-xl flex items-center justify-center text-lg font-bold font-mono transition-all duration-150 border ${style.bg} ${style.text} ${style.shadow}`}
                    >
                      {val > 0 ? val : ''}
                    </div>
                  );
                })
              )}
            </div>

            {/* Helper Controls (Touch Screen Navigation Buttons) */}
            <div className="grid grid-cols-3 gap-2 w-full max-w-xs mt-3">
              <div />
              <button
                onClick={() => move('up')}
                className="py-2 rounded-xl bg-cyber-card border border-cyber-border active:scale-95 text-xs text-slate-300 font-bold"
              >
                ▲ UP
              </button>
              <div />
              <button
                onClick={() => move('left')}
                className="py-2 rounded-xl bg-cyber-card border border-cyber-border active:scale-95 text-xs text-slate-300 font-bold"
              >
                ◀ LEFT
              </button>
              <button
                onClick={() => move('down')}
                className="py-2 rounded-xl bg-cyber-card border border-cyber-border active:scale-95 text-xs text-slate-300 font-bold"
              >
                ▼ DOWN
              </button>
              <button
                onClick={() => move('right')}
                className="py-2 rounded-xl bg-cyber-card border border-cyber-border active:scale-95 text-xs text-slate-300 font-bold"
              >
                RIGHT ▶
              </button>
            </div>

            {/* Finish / Cash Out Option */}
            {gameState === 'playing' && (
              <div className="w-full max-w-xs mt-3 flex items-center space-x-2">
                <button
                  onClick={handleFinishRound}
                  disabled={elapsedSec < 20}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold font-mono flex items-center justify-center space-x-1.5 transition-all ${
                    elapsedSec >= 20
                      ? 'bg-purple-600/30 border-purple-500 text-purple-200 hover:bg-purple-600/40 active:scale-98 shadow-md'
                      : 'bg-cyber-card/40 border-cyber-border/40 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Award size={14} />
                  <span>{elapsedSec < 20 ? `CASH OUT (${20 - elapsedSec}s)` : 'CLAIM REWARDS NOW'}</span>
                </button>
              </div>
            )}

            {/* Claimed Modal Overlay */}
            {gameState === 'claimed' && rewardClaim && (
              <div className="w-full glass-panel p-5 rounded-2xl border border-purple-500/60 mt-4 text-center animate-in fade-in duration-300">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400 text-purple-300 flex items-center justify-center mx-auto mb-2.5 shadow-md">
                  <CheckCircle2 size={26} />
                </div>
                <h3 className="text-base font-bold text-white tracking-wide">TILE RUN COMPLETED!</h3>
                <p className="text-xs text-slate-300 mt-1">Final Score: {score} Points</p>

                <div className="grid grid-cols-2 gap-3 my-3.5">
                  <div className="bg-cyber-bg/70 p-2.5 rounded-xl border border-cyber-border">
                    <div className="text-[10px] uppercase font-mono text-slate-400">NC Bounties</div>
                    <div className="text-sm font-bold text-cyber-gold font-mono flex items-center justify-center space-x-1.5 mt-0.5">
                      <NcIcon className="w-4 h-4" />
                      <span>+{rewardClaim.nc} NC</span>
                    </div>
                  </div>
                  <div className="bg-cyber-bg/70 p-2.5 rounded-xl border border-cyber-border">
                    <div className="text-[10px] uppercase font-mono text-slate-400">TON Reward</div>
                    <div className="text-sm font-bold text-cyber-cyan font-mono flex items-center justify-center space-x-1.5 mt-0.5">
                      <TonIcon className="w-4 h-4" />
                      <span>+{rewardClaim.ton} TON</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={initGame}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-cyber-card border border-cyber-border text-xs font-bold text-white hover:border-purple-400 flex items-center justify-center space-x-1.5 transition-all"
                  >
                    <RotateCcw size={14} />
                    <span>PLAY AGAIN</span>
                  </button>
                  <button
                    onClick={onBack}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md transition-all"
                  >
                    <Award size={14} />
                    <span>RETURN TO HUB</span>
                  </button>
                </div>
              </div>
            )}

            {/* Game Over Modal Overlay */}
            {gameState === 'gameover' && !rewardClaim && (
              <div className="w-full glass-panel p-5 rounded-2xl border border-cyber-red/50 mt-4 text-center animate-in fade-in duration-300">
                <div className="w-12 h-12 rounded-2xl bg-cyber-red/20 border border-cyber-red text-cyber-red flex items-center justify-center mx-auto mb-2.5">
                  <AlertCircle size={26} />
                </div>
                <h3 className="text-base font-bold text-white tracking-wide">
                  {errorMsg ? 'VERIFICATION FAILED' : 'NO MOVES REMAINING'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {errorMsg || `Final run score: ${score} pts.`}
                </p>

                <div className="flex items-center space-x-2 mt-4">
                  {elapsedSec >= 20 && !errorMsg ? (
                    <button
                      onClick={handleFinishRound}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center space-x-1.5 transition-all"
                    >
                      <Award size={14} />
                      <span>CLAIM RUN REWARD</span>
                    </button>
                  ) : (
                    <button
                      onClick={initGame}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-cyber-card border border-cyber-border text-xs font-bold text-white hover:border-cyber-cyan flex items-center justify-center space-x-1.5 transition-all"
                    >
                      <RotateCcw size={14} />
                      <span>RETRY RUN</span>
                    </button>
                  )}
                  <button
                    onClick={onBack}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-cyber-bg border border-cyber-border text-xs font-bold text-slate-300 hover:text-white transition-all"
                  >
                    <span>RETURN TO HUB</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
    </div>
  );
};
