import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../services/api.js';
import { useTelegram } from '../../hooks/useTelegram.js';
import { ArrowLeft, Clock, RotateCcw, Award, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface MemoryGameProps {
  onBack: () => void;
  onFinished: (ncAwarded: number, tonAwarded: string) => void;
}

interface CardItem {
  id: number;
  symbol: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const ICONS = ['💎', '⚡', '🔋', '🖥️', '🏎️', '🪙'];

function generateDeck(): CardItem[] {
  const deck: CardItem[] = [];
  let id = 0;
  for (const sym of ICONS) {
    deck.push({ id: id++, symbol: sym, isFlipped: false, isMatched: false });
    deck.push({ id: id++, symbol: sym, isFlipped: false, isMatched: false });
  }
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export const MemoryGame: React.FC<MemoryGameProps> = ({ onBack, onFinished }) => {
  const { haptic } = useTelegram();
  const [cards, setCards] = useState<CardItem[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState<number>(0);
  const [matchedPairs, setMatchedPairs] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(45);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<'loading' | 'playing' | 'won' | 'lost' | 'submitting'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rewardClaim, setRewardClaim] = useState<{ nc: number; ton: string } | null>(null);

  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<any>(null);
  const isLockedRef = useRef<boolean>(false);

  // Initialize session and deck
  const initGame = useCallback(async () => {
    try {
      setGameState('loading');
      setErrorMsg(null);
      setRewardClaim(null);
      setCards(generateDeck());
      setFlippedIndices([]);
      setMoves(0);
      setMatchedPairs(0);
      setTimeLeft(45);
      isLockedRef.current = false;

      const res = await api.startGame('game_memory');
      setSessionId(res.sessionId);
      startTimeRef.current = Date.now();
      setGameState('playing');
    } catch (err) {
      setErrorMsg((err as Error).message || 'Failed to initialize session');
      setGameState('lost');
    }
  }, []);

  useEffect(() => {
    initGame();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [initGame]);

  // Timer countdown
  useEffect(() => {
    if (gameState !== 'playing') return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setGameState('lost');
          haptic('error');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, haptic]);

  // Handle Win Submission
  const handleWin = useCallback(async () => {
    if (!sessionId) return;
    setGameState('submitting');
    haptic('success');

    try {
      // Fire victory confetti
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });

      // Anti-cheat: Minimum 10 seconds. If finished faster, delay slightly to meet server policy
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      if (elapsed < 10.5) {
        const waitMs = Math.ceil((10.5 - elapsed) * 1000);
        await new Promise((r) => setTimeout(r, waitMs));
      }

      // Calculate score based on time remaining and moves
      const finalScore = Math.max(10, timeLeft * 10 - moves * 2);
      const res = await api.finishGame(sessionId, finalScore);

      const nc = res.reward?.nc ?? res.ncAwarded ?? 45;
      const ton = res.reward?.ton ?? res.tonAwarded ?? '0.000015';

      setRewardClaim({ nc, ton });
      setGameState('won');
      onFinished(nc, ton);
    } catch (err) {
      setErrorMsg((err as Error).message || 'Validation failed');
      setGameState('lost');
      haptic('error');
    }
  }, [sessionId, timeLeft, moves, onFinished, haptic]);

  // Check if all pairs matched
  useEffect(() => {
    if (matchedPairs === 6 && gameState === 'playing') {
      if (timerRef.current) clearInterval(timerRef.current);
      handleWin();
    }
  }, [matchedPairs, gameState, handleWin]);

  // Handle Card Click
  const handleCardClick = (index: number) => {
    if (gameState !== 'playing' || isLockedRef.current) return;
    const card = cards[index];
    if (card.isFlipped || card.isMatched) return;

    haptic('light');

    // Flip the card
    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      isLockedRef.current = true;
      const [firstIdx, secondIdx] = newFlipped;
      const firstCard = cards[firstIdx];
      const secondCard = cards[secondIdx];

      if (firstCard.symbol === secondCard.symbol) {
        // MATCH!
        haptic('medium');
        setTimeout(() => {
          setCards((prev) => {
            const updated = [...prev];
            updated[firstIdx].isMatched = true;
            updated[secondIdx].isMatched = true;
            return updated;
          });
          setMatchedPairs((p) => p + 1);
          setFlippedIndices([]);
          isLockedRef.current = false;
        }, 300);
      } else {
        // MISMATCH -> Flip back after 700ms
        setTimeout(() => {
          setCards((prev) => {
            const updated = [...prev];
            updated[firstIdx].isFlipped = false;
            updated[secondIdx].isFlipped = false;
            return updated;
          });
          setFlippedIndices([]);
          isLockedRef.current = false;
        }, 700);
      }
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Top Bar: Back Button, Title, Stats */}
      <div className="w-full flex items-center justify-between py-2 mb-3">
        <button
          onClick={onBack}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyber-card border border-cyber-border text-xs text-slate-300 hover:text-white transition-all active:scale-95"
        >
          <ArrowLeft size={14} />
          <span>HUB</span>
        </button>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-cyber-bg border border-cyber-border text-xs font-mono">
            <Clock size={13} className={timeLeft <= 10 ? 'text-cyber-red animate-pulse' : 'text-cyber-cyan'} />
            <span className={timeLeft <= 10 ? 'text-cyber-red font-bold' : 'text-slate-200 font-bold'}>
              {timeLeft}s
            </span>
          </div>

          <div className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-cyber-bg border border-cyber-border text-xs font-mono text-slate-300">
            <span>PAIRS:</span>
            <span className="text-cyber-cyan font-bold">{matchedPairs}/6</span>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {gameState === 'loading' && (
        <div className="w-full h-80 flex flex-col items-center justify-center glass-panel rounded-2xl border border-cyber-border">
          <Loader2 size={32} className="animate-spin text-cyber-cyan mb-3" />
          <p className="text-xs font-mono text-slate-300">ESTABLISHING GAME MATRIX SESSION...</p>
        </div>
      )}

      {/* Submitting State */}
      {gameState === 'submitting' && (
        <div className="w-full h-80 flex flex-col items-center justify-center glass-panel rounded-2xl border border-cyber-border text-center p-4">
          <Loader2 size={36} className="animate-spin text-cyber-gold mb-3" />
          <h3 className="text-sm font-bold text-white tracking-wide">VERIFYING MEMORY PROOF</h3>
          <p className="text-xs font-mono text-slate-400 mt-1">Submitting cryptographic match state to nodes...</p>
        </div>
      )}

      {/* Playing Board */}
      {(gameState === 'playing' || gameState === 'won' || gameState === 'lost') && (
        <div className="w-full flex flex-col items-center">
          {/* 12-Card Grid (4 columns x 3 rows) */}
          <div className="grid grid-cols-4 gap-2.5 w-full max-w-sm">
            {cards.map((card, idx) => {
              const showFace = card.isFlipped || card.isMatched;
              return (
                <button
                  key={card.id}
                  onClick={() => handleCardClick(idx)}
                  disabled={card.isMatched || card.isFlipped || isLockedRef.current || gameState !== 'playing'}
                  className={`aspect-square rounded-2xl flex items-center justify-center text-2xl transition-all duration-300 transform select-none ${
                    card.isMatched
                      ? 'bg-cyber-cyan/20 border-2 border-cyber-cyan shadow-glow-cyan/40 scale-95'
                      : showFace
                      ? 'bg-gradient-to-tr from-cyber-card to-cyber-bg border-2 border-cyber-cyan text-white scale-100 shadow-md'
                      : 'bg-cyber-card/90 border border-cyber-border hover:border-cyber-cyan/50 active:scale-95 shadow-inner'
                  }`}
                >
                  {showFace ? (
                    <span className="animate-in zoom-in duration-200">{card.symbol}</span>
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-cyber-cyan/20 border border-cyber-cyan/50" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Win Modal Overlay */}
          {gameState === 'won' && rewardClaim && (
            <div className="w-full glass-panel p-5 rounded-2xl border border-cyber-cyan/60 mt-4 text-center animate-in fade-in duration-300">
              <div className="w-12 h-12 rounded-2xl bg-cyber-cyan/20 border border-cyber-cyan text-cyber-cyan flex items-center justify-center mx-auto mb-2.5 shadow-glow-cyan">
                <CheckCircle2 size={26} />
              </div>
              <h3 className="text-base font-bold text-white tracking-wide">MATRIX DECRYPTED!</h3>
              <p className="text-xs text-slate-300 mt-1">All 6 cryptographic nodes matched successfully.</p>

              <div className="grid grid-cols-2 gap-3 my-3.5">
                <div className="bg-cyber-bg/70 p-2.5 rounded-xl border border-cyber-border">
                  <div className="text-[10px] uppercase font-mono text-slate-400">NC Bounties</div>
                  <div className="text-sm font-bold text-cyber-gold font-mono">+{rewardClaim.nc} NC</div>
                </div>
                <div className="bg-cyber-bg/70 p-2.5 rounded-xl border border-cyber-border">
                  <div className="text-[10px] uppercase font-mono text-slate-400">TON Reward</div>
                  <div className="text-sm font-bold text-cyber-cyan font-mono">+{rewardClaim.ton} TON</div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={initGame}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-cyber-card border border-cyber-border text-xs font-bold text-white hover:border-cyber-cyan flex items-center justify-center space-x-1.5 transition-all"
                >
                  <RotateCcw size={14} />
                  <span>PLAY AGAIN</span>
                </button>
                <button
                  onClick={onBack}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-cyber-cyan text-slate-950 text-xs font-bold flex items-center justify-center space-x-1.5 shadow-glow-cyan transition-all"
                >
                  <Award size={14} />
                  <span>CLAIM & EXIT</span>
                </button>
              </div>
            </div>
          )}

          {/* Lost Modal Overlay */}
          {gameState === 'lost' && (
            <div className="w-full glass-panel p-5 rounded-2xl border border-cyber-red/50 mt-4 text-center animate-in fade-in duration-300">
              <div className="w-12 h-12 rounded-2xl bg-cyber-red/20 border border-cyber-red text-cyber-red flex items-center justify-center mx-auto mb-2.5">
                <AlertCircle size={26} />
              </div>
              <h3 className="text-base font-bold text-white tracking-wide">
                {errorMsg ? 'VERIFICATION ERROR' : 'TIME EXPIRED'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {errorMsg || 'The 45-second matrix cycle timed out before all pairs were matched.'}
              </p>

              <div className="flex items-center space-x-2 mt-4">
                <button
                  onClick={initGame}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-cyber-card border border-cyber-border text-xs font-bold text-white hover:border-cyber-cyan flex items-center justify-center space-x-1.5 transition-all"
                >
                  <RotateCcw size={14} />
                  <span>RETRY ROUND</span>
                </button>
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
