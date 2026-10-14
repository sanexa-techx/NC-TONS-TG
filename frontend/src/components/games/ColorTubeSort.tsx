import React, { useState, useEffect, useRef, useCallback } from 'react';
import WebApp from '@twa-dev/sdk';
import { RotateCcw, ArrowLeft, Trophy, Sparkles, Undo2, Timer, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { TonIcon, NcIcon } from '../icons/index.js';
import { api } from '../../services/api.js';
import { useTelegram } from '../../hooks/useTelegram.js';
import { useAdManager, setGameActiveState } from '../../hooks/useAdManager.js';

interface GameProps {
  userId?: number | string;
  onBack: () => void;
  onFinished?: (ncAwarded: number, tonAwarded: string) => void;
  onGameComplete?: (balances: any) => void;
}

// 4 distinct fluid colors with vibrant cyber neon gradients and glow styling
const COLORS: Record<string, { bg: string; glow: string; name: string }> = {
  R: {
    bg: 'bg-gradient-to-t from-red-600 via-rose-500 to-rose-400',
    glow: 'shadow-[0_0_12px_rgba(244,63,94,0.6)]',
    name: 'Ruby Isotope',
  },
  B: {
    bg: 'bg-gradient-to-t from-blue-600 via-sky-500 to-cyan-400',
    glow: 'shadow-[0_0_12px_rgba(56,189,248,0.6)]',
    name: 'Cobalt Isotope',
  },
  Y: {
    bg: 'bg-gradient-to-t from-amber-600 via-yellow-500 to-amber-300',
    glow: 'shadow-[0_0_12px_rgba(250,204,21,0.6)]',
    name: 'Solar Isotope',
  },
  G: {
    bg: 'bg-gradient-to-t from-emerald-600 via-teal-500 to-emerald-400',
    glow: 'shadow-[0_0_12px_rgba(52,211,153,0.6)]',
    name: 'Emerald Isotope',
  },
};

// Preset solvable puzzles designed for strategic sorting
const LEVELS: string[][][] = [
  [
    ['R', 'B', 'R', 'B'],
    ['B', 'R', 'B', 'R'],
    ['Y', 'G', 'Y', 'G'],
    ['G', 'Y', 'G', 'Y'],
    [],
    [],
  ],
  [
    ['R', 'G', 'B', 'Y'],
    ['G', 'B', 'Y', 'R'],
    ['B', 'Y', 'R', 'G'],
    ['Y', 'R', 'G', 'B'],
    [],
    [],
  ],
  [
    ['Y', 'B', 'G', 'R'],
    ['G', 'R', 'Y', 'B'],
    ['B', 'G', 'R', 'Y'],
    ['R', 'Y', 'B', 'G'],
    [],
    [],
  ],
];

// 1-minute (60 seconds) game countdown limit
const TOTAL_GAME_TIME = 60;

export const ColorTubeSort: React.FC<GameProps> = ({
  userId,
  onBack,
  onFinished,
  onGameComplete,
}) => {
  const { haptic } = useTelegram();
  const { showPostGameAd } = useAdManager(userId || '');

  const [tubes, setTubes] = useState<string[][]>([]);
  const [selectedTube, setSelectedTube] = useState<number | null>(null);
  const [moves, setMoves] = useState<number>(0);
  const [history, setHistory] = useState<string[][][]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [hasWon, setHasWon] = useState<boolean>(false);
  const [isTimeUp, setIsTimeUp] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [loadingSession, setLoadingSession] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(TOTAL_GAME_TIME);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const timerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(Date.now());
  const initialLevelRef = useRef<string[][]>([]);

  // Keep ad system informed that game is active to protect user flow
  useEffect(() => {
    if (!hasWon && !loadingSession && !isTimeUp) {
      setGameActiveState(true);
    } else {
      setGameActiveState(false);
    }
  }, [hasWon, loadingSession, isTimeUp]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setGameActiveState(false);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // 1-minute countdown timer loop
  useEffect(() => {
    if (loadingSession || hasWon || isTimeUp) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTimeRef.current) / 1000);
      setElapsedSeconds(elapsed);

      const remaining = Math.max(0, TOTAL_GAME_TIME - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timerRef.current);
        setIsTimeUp(true);
        try {
          if (WebApp.HapticFeedback) {
            WebApp.HapticFeedback.notificationOccurred('error');
          } else {
            haptic('error');
          }
        } catch {}
      }
    }, 250);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loadingSession, hasWon, isTimeUp, haptic]);

  // Anti-cheat verification timer if solved within 15 seconds
  useEffect(() => {
    if (!hasWon) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsedSeconds(elapsed);
      if (elapsed >= 15) {
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [hasWon]);

  // Initialize game session and select random level
  const initGame = useCallback(async () => {
    setLoadingSession(true);
    setErrorMessage(null);
    setSelectedTube(null);
    setMoves(0);
    setHistory([]);
    setHasWon(false);
    setIsTimeUp(false);
    setSubmitting(false);

    const randomLevel = LEVELS[Math.floor(Math.random() * LEVELS.length)];
    const cloned = JSON.parse(JSON.stringify(randomLevel));
    initialLevelRef.current = JSON.parse(JSON.stringify(randomLevel));
    setTubes(cloned);

    startTimeRef.current = Date.now();
    setTimeLeft(TOTAL_GAME_TIME);
    setElapsedSeconds(0);

    try {
      const res = await api.startGame('game_tubesort');
      if (res && res.sessionId) {
        setSessionId(res.sessionId);
      } else {
        setSessionId(`tubesort_${Date.now()}`);
      }
    } catch (e: any) {
      console.warn('Session start note:', e);
      setSessionId(`tubesort_${Date.now()}`);
    } finally {
      setLoadingSession(false);
    }
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  // Restart current level
  const handleRestartLevel = () => {
    if (initialLevelRef.current.length > 0) {
      setTubes(JSON.parse(JSON.stringify(initialLevelRef.current)));
      setSelectedTube(null);
      setHistory([]);
      startTimeRef.current = Date.now();
      setTimeLeft(TOTAL_GAME_TIME);
      setElapsedSeconds(0);
      setIsTimeUp(false);
      haptic('light');
    }
  };

  // Undo last pour
  const handleUndo = () => {
    if (history.length === 0 || hasWon || submitting || isTimeUp) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, prev.length - 1));
    setTubes(previous);
    setSelectedTube(null);
    haptic('medium');
  };

  // Check if each tube is uniform or empty
  const checkWinCondition = (currentTubes: string[][]) => {
    const isComplete = currentTubes.every((tube) => {
      if (tube.length === 0) return true;
      if (tube.length === 4) {
        return tube.every((c) => c === tube[0]);
      }
      return false;
    });

    if (isComplete) {
      setHasWon(true);
      if (timerRef.current) clearInterval(timerRef.current);

      try {
        if (WebApp.HapticFeedback) {
          WebApp.HapticFeedback.notificationOccurred('success');
        } else {
          haptic('success');
        }
      } catch {}

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#F59E0B', '#0098EA', '#10B981', '#EF4444'],
        });
      } catch {}
    }
  };

  // Handle Tube Click & Pour Logic
  const handleTubeClick = (index: number) => {
    if (hasWon || submitting || loadingSession || isTimeUp) return;

    try {
      if (WebApp.HapticFeedback) {
        WebApp.HapticFeedback.impactOccurred('light');
      } else {
        haptic('light');
      }
    } catch {}

    if (selectedTube === null) {
      if (tubes[index].length > 0) {
        setSelectedTube(index);
      }
    } else {
      if (selectedTube === index) {
        setSelectedTube(null); // Deselect
      } else {
        pourLiquid(selectedTube, index);
      }
    }
  };

  const pourLiquid = (from: number, to: number) => {
    const source = [...tubes[from]];
    const target = [...tubes[to]];

    if (source.length === 0) return;
    if (target.length >= 4) {
      setSelectedTube(null);
      return;
    }

    const liquidColor = source[source.length - 1];

    // Allowed: Target is empty OR top liquid color matches
    if (target.length === 0 || target[target.length - 1] === liquidColor) {
      // Save state for Undo
      setHistory((prev) => [...prev, JSON.parse(JSON.stringify(tubes))]);

      // Pour all contiguous segments of the same color that fit
      while (
        source.length > 0 &&
        source[source.length - 1] === liquidColor &&
        target.length < 4
      ) {
        target.push(source.pop()!);
      }

      const nextTubes = [...tubes];
      nextTubes[from] = source;
      nextTubes[to] = target;

      setTubes(nextTubes);
      setSelectedTube(null);
      setMoves((m) => m + 1);

      try {
        if (WebApp.HapticFeedback) {
          WebApp.HapticFeedback.impactOccurred('medium');
        } else {
          haptic('medium');
        }
      } catch {}

      checkWinCondition(nextTubes);
    } else {
      setSelectedTube(null);
    }
  };

  // Claim Bounty
  const handleClaim = async () => {
    if (!sessionId || submitting) return;

    // Minimum anti-cheat duration verification (15 seconds)
    const currentElapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    if (currentElapsed < 15) {
      setErrorMessage(`Anti-cheat security: solve duration must be >= 15 seconds. Please wait ${15 - currentElapsed}s.`);
      return;
    }

    if (moves < 8) {
      setErrorMessage(`Anti-cheat security: solve moves must be >= 8 (current: ${moves}).`);
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      let result: any = null;
      if (sessionId) {
        try {
          result = await api.finishGame(sessionId, moves, moves);
        } catch (apiErr: any) {
          console.warn('Game finish API note:', apiErr);
        }
      }

      const nc = result?.reward?.nc ?? result?.ncAwarded ?? 55;
      const ton = result?.reward?.ton ?? result?.tonAwarded ?? '0.000020';

      if (onFinished) {
        onFinished(nc, ton);
      }
      if (onGameComplete) {
        onGameComplete(result?.newBalances || result || { nc, ton });
      }

      try {
        showPostGameAd().catch(() => {});
      } catch {}

      onBack();
    } catch (e: any) {
      setErrorMessage(e.message || 'Error claiming bounty rewards');
      haptic('error');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isEligibleForClaim = elapsedSeconds >= 15 && moves >= 8;

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-slate-800 flex flex-col justify-between p-4 select-none w-full max-w-md mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-white border border-[#E2E8F0] text-slate-700 hover:text-slate-900 transition active:scale-95 shadow-2xs"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h3 className="font-extrabold text-sm tracking-wide text-amber-700 flex items-center justify-center gap-1.5">
            <span>🧪</span> COLOR TUBE SORT
          </h3>
          <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500 font-mono mt-0.5">
            <span
              className={`flex items-center gap-1 font-bold ${
                timeLeft <= 10
                  ? 'text-rose-600 animate-pulse'
                  : timeLeft <= 20
                  ? 'text-amber-600'
                  : 'text-[#2563EB]'
              }`}
            >
              <Timer className="w-3.5 h-3.5" />
              {formatTimer(timeLeft)}
            </span>
            <span>•</span>
            <span className="text-amber-700 font-bold">Moves: {moves}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleUndo}
            disabled={history.length === 0 || hasWon || submitting || isTimeUp}
            title="Undo move"
            className="p-2 rounded-xl bg-white border border-[#E2E8F0] text-slate-700 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition active:scale-95 shadow-2xs"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRestartLevel}
            disabled={hasWon || submitting}
            title="Reset level"
            className="p-2 rounded-xl bg-white border border-[#E2E8F0] text-slate-700 hover:text-slate-900 transition active:scale-95 shadow-2xs"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Loading state indicator */}
      {loadingSession && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-xs font-mono text-slate-500">Synthesizing chemical flasks...</p>
        </div>
      )}

      {/* Tubes Flasks Grid */}
      {!loadingSession && (
        <div className="my-auto py-6">
          <div className="grid grid-cols-3 gap-y-6 gap-x-4 px-2 place-items-center">
            {tubes.map((tube, idx) => {
              const isSelected = selectedTube === idx;
              const isFullUniform = tube.length === 4 && tube.every((c) => c === tube[0]);

              return (
                <div
                  key={idx}
                  onClick={() => handleTubeClick(idx)}
                  className={`relative w-14 sm:w-16 h-44 sm:h-48 rounded-b-3xl border-2 transition-all duration-300 cursor-pointer flex flex-col-reverse p-1 gap-1 bg-white/80 backdrop-blur-md shadow-xs ${
                    isSelected
                      ? 'border-amber-400 -translate-y-4 ring-2 ring-amber-400/40'
                      : isFullUniform
                      ? 'border-[#10B981]'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                >
                  {/* Glass Top Lip */}
                  <div className="absolute -top-3 -left-1.5 -right-1.5 h-3 border-2 border-slate-300 rounded-t-lg bg-slate-100" />

                  {/* Glass Gloss Highlight Line */}
                  <div className="absolute top-1 right-2 bottom-4 w-1 bg-slate-200/50 rounded-full pointer-events-none" />

                  {/* Liquid Segments */}
                  {tube.map((color, colorIdx) => (
                    <div
                      key={colorIdx}
                      className={`w-full h-8 sm:h-9 rounded-xl ${COLORS[color]?.bg || 'bg-slate-500'} ${
                        COLORS[color]?.glow || ''
                      } transition-all duration-300 drop-shadow`}
                    />
                  ))}

                  {/* Empty Flask Indicator */}
                  {tube.length === 0 && (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                      Buffer
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Error Notice */}
          {errorMessage && (
            <div className="mt-4 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* Bottom Hint */}
      <div className="text-center space-y-1.5 pt-2">
        <p className="text-[11px] text-slate-500 font-medium">
          Tap a tube to lift it, then tap another tube to pour matching fluid.
        </p>
        <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB]" />
          <span>1-min timer • Min. 15s elapsed &amp; 8 moves</span>
        </div>
      </div>

      {/* Time's Up Defeat Modal */}
      {isTimeUp && !hasWon && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-red-200 rounded-3xl w-full max-w-sm p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto text-red-600">
              <Timer className="w-8 h-8 animate-pulse text-red-600" />
            </div>

            <div className="space-y-1">
              <h4 className="text-xl font-black text-slate-900 tracking-wide">TIME EXPIRED!</h4>
              <p className="text-xs text-slate-500">
                The 1-minute countdown ran out before all chemical flasks were sorted.
              </p>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3.5 rounded-2xl flex items-center justify-around font-mono text-xs text-slate-700">
              <div>
                <span className="text-slate-400 block text-[10px]">TIME LIMIT</span>
                <span className="text-red-600 font-bold">00:00</span>
              </div>
              <div className="w-[1px] h-6 bg-[#E2E8F0]" />
              <div>
                <span className="text-slate-400 block text-[10px]">MOVES</span>
                <span className="text-amber-600 font-bold">{moves}</span>
              </div>
              <div className="w-[1px] h-6 bg-[#E2E8F0]" />
              <div>
                <span className="text-slate-400 block text-[10px]">SORTED</span>
                <span className="text-[#10B981] font-bold">
                  {tubes.filter((t) => t.length === 4 && t.every((c) => c === t[0])).length} / 4
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={initGame}
                className="w-full py-3.5 rounded-2xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-sm flex items-center justify-center gap-2 transition active:scale-98 shadow-xs"
              >
                <RotateCcw className="w-4 h-4" />
                Try Again (1 Min)
              </button>
              <button
                onClick={onBack}
                className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-[#E2E8F0] text-slate-700 font-medium text-xs transition active:scale-98"
              >
                Return to Arcade Hub
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Win Celebration Modal */}
      {hasWon && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-3xl w-full max-w-sm p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-[#10B981]">
              <Trophy className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h4 className="text-xl font-black text-slate-900">FLASKS SORTED!</h4>
              <p className="text-xs text-slate-500">
                You successfully segregated all chemical isotopes!
              </p>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3.5 rounded-2xl flex items-center justify-around font-mono text-sm">
              <div className="flex items-center gap-1.5 text-[#10B981] font-bold">
                <NcIcon className="w-4 h-4" /> +55 NC
              </div>
              <div className="flex items-center gap-1.5 text-[#2563EB] font-bold">
                <TonIcon className="w-4 h-4" /> +0.000020 TON
              </div>
            </div>

            {/* Anti-cheat countdown if player solved in < 15s */}
            {!isEligibleForClaim && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-center gap-2 font-mono">
                <Timer className="w-4 h-4 animate-pulse text-amber-600" />
                <span>Anti-cheat lock: {15 - elapsedSeconds}s remaining to claim...</span>
              </div>
            )}

            <button
              onClick={handleClaim}
              disabled={submitting || !isEligibleForClaim}
              className="w-full py-3.5 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-sm flex items-center justify-center gap-2 transition active:scale-98 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              {submitting ? 'Claiming Bounty...' : 'Collect Bounty to Wallet'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorTubeSort;
