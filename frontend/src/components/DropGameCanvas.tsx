import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { api } from '../services/api.js';
import { useTelegram } from '../hooks/useTelegram.js';
import { Play, RotateCcw, Zap, Trophy, AlertCircle } from 'lucide-react';

interface DropGameCanvasProps {
  onGameFinished?: (ncAwarded: number, tonAwarded: string) => void;
}

interface Item {
  id: number;
  x: number;
  y: number;
  radius: number;
  speed: number;
  type: 'gold' | 'gem' | 'hazard';
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
}

export const DropGameCanvas: React.FC<DropGameCanvasProps> = ({ onGameFinished }) => {
  const { haptic } = useTelegram();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'finished'>('idle');
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [score, setScore] = useState<number>(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [rewards, setRewards] = useState<{ ncAwarded: number; tonAwarded: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Game state references for 60fps requestAnimationFrame loop
  const catcherRef = useRef<{ x: number; y: number; width: number; height: number }>({
    x: 150,
    y: 460,
    width: 80,
    height: 18,
  });
  const itemsRef = useRef<Item[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const scoreRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const lastSpawnRef = useRef<number>(0);
  const itemIdCounter = useRef<number>(0);

  // Start game session from backend
  const handleStart = async () => {
    setError(null);
    setRewards(null);
    setScore(0);
    scoreRef.current = 0;
    setTimeLeft(30);
    itemsRef.current = [];
    particlesRef.current = [];

    try {
      const res = await api.startGame();
      setSessionId(res.sessionId);
      setGameState('playing');
      haptic('medium');
    } catch (err) {
      setError((err as Error).message || 'Failed to initialize game session');
    }
  };

  // Finish game session and validate on backend
  const handleFinish = async (finalScore: number, currentSessionId: string) => {
    setGameState('finished');
    setSubmitting(true);
    try {
      const result = await api.finishGame(currentSessionId, finalScore);
      setRewards({
        ncAwarded: result.ncAwarded,
        tonAwarded: result.tonAwarded,
      });
      haptic('success');
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00f0ff', '#ffb703', '#ffffff'],
      });
      onGameFinished?.(result.ncAwarded, result.tonAwarded);
    } catch (err) {
      setError((err as Error).message || 'Validation error');
      haptic('error');
    } finally {
      setSubmitting(false);
    }
  };

  // Timer countdown
  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (sessionId) {
            handleFinish(scoreRef.current, sessionId);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, sessionId]);

  // Main Canvas Render Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    const width = (canvas.width = canvas.parentElement?.clientWidth || 360);
    const height = (canvas.height = 500);

    catcherRef.current.y = height - 35;
    catcherRef.current.x = width / 2 - catcherRef.current.width / 2;

    const spawnItem = (now: number) => {
      if (now - lastSpawnRef.current > 420) {
        lastSpawnRef.current = now;
        const rand = Math.random();
        let type: 'gold' | 'gem' | 'hazard' = 'gold';
        if (rand < 0.22) type = 'hazard'; // 22% hazard
        else if (rand < 0.45) type = 'gem'; // 23% cyan gem
        // 55% gold coin

        itemsRef.current.push({
          id: itemIdCounter.current++,
          x: Math.random() * (width - 40) + 20,
          y: -20,
          radius: type === 'gem' ? 14 : type === 'gold' ? 13 : 15,
          speed: 2.8 + Math.random() * 2.2,
          type,
        });
      }
    };

    const createParticles = (x: number, y: number, color: string) => {
      for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 1;
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: Math.random() * 3 + 1,
          color,
          alpha: 1,
        });
      }
    };

    const render = (now: number) => {
      ctx.clearRect(0, 0, width, height);

      // 1. Spawn falling items
      spawnItem(now);

      // 2. Update & draw particles
      particlesRef.current.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.03;
        if (p.alpha <= 0) {
          particlesRef.current.splice(idx, 1);
          return;
        }
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 3. Update & draw falling items
      const catcher = catcherRef.current;
      itemsRef.current.forEach((item, index) => {
        item.y += item.speed;

        // Collision detection with catcher
        const isColliding =
          item.y + item.radius >= catcher.y &&
          item.y - item.radius <= catcher.y + catcher.height &&
          item.x + item.radius >= catcher.x &&
          item.x - item.radius <= catcher.x + catcher.width;

        if (isColliding) {
          if (item.type === 'gold') {
            scoreRef.current += 10;
            createParticles(item.x, item.y, '#ffb703');
            haptic('light');
          } else if (item.type === 'gem') {
            scoreRef.current += 25;
            createParticles(item.x, item.y, '#00f0ff');
            haptic('medium');
          } else {
            scoreRef.current = Math.max(0, scoreRef.current - 15);
            createParticles(item.x, item.y, '#ff0055');
            haptic('error');
          }
          setScore(scoreRef.current);
          itemsRef.current.splice(index, 1);
          return;
        }

        // Draw items
        ctx.save();
        if (item.type === 'gold') {
          // Gold Coin
          ctx.fillStyle = '#ffb703';
          ctx.shadowColor = '#ffb703';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // NC symbol
          ctx.fillStyle = '#090c12';
          ctx.font = 'bold 10px JetBrains Mono';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('NC', item.x, item.y);
        } else if (item.type === 'gem') {
          // Cyan Gem (Diamond shape)
          ctx.fillStyle = '#00f0ff';
          ctx.shadowColor = '#00f0ff';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.moveTo(item.x, item.y - item.radius);
          ctx.lineTo(item.x + item.radius, item.y);
          ctx.lineTo(item.x, item.y + item.radius);
          ctx.lineTo(item.x - item.radius, item.y);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else {
          // Red Hazard Spikes
          ctx.fillStyle = '#ff0055';
          ctx.shadowColor = '#ff0055';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffb703';
          ctx.lineWidth = 2;
          ctx.stroke();

          // X mark
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('✕', item.x, item.y);
        }
        ctx.restore();

        // Remove offscreen items
        if (item.y > height + 20) {
          itemsRef.current.splice(index, 1);
        }
      });

      // 4. Draw Catcher Basket
      ctx.save();
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 15;
      // Rounded catcher bar
      ctx.beginPath();
      ctx.roundRect(catcher.x, catcher.y, catcher.width, catcher.height, 8);
      ctx.fill();

      // Top glowing sensor rim
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(catcher.x + 4, catcher.y + 2, catcher.width - 8, 3);
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    // Touch & Pointer event handlers for moving catcher
    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      catcherRef.current.x = Math.max(0, Math.min(width - catcherRef.current.width, clientX - catcherRef.current.width / 2));
    };

    window.addEventListener('pointermove', handlePointerMove);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, [gameState]);

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center">
      {/* Header HUD */}
      <div className="w-full flex items-center justify-between glass-panel px-4 py-3 rounded-2xl mb-3 border border-cyber-border">
        <div className="flex items-center space-x-2">
          <div className="text-xs text-slate-400 font-medium">SCORE:</div>
          <div className="text-xl font-bold font-mono text-cyber-gold">{score}</div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-xs text-slate-400 font-medium">TIME:</div>
          <div
            className={`text-xl font-bold font-mono ${
              timeLeft <= 5 ? 'text-cyber-red animate-pulse' : 'text-cyber-cyan'
            }`}
          >
            {timeLeft}s
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative w-full rounded-3xl overflow-hidden glass-panel border border-cyber-cyan/30 shadow-glow-cyan/20 h-[500px]">
        {gameState === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-cyber-bg/90 backdrop-blur-sm">
            <div className="w-20 h-20 rounded-full bg-cyber-cyan/20 flex items-center justify-center text-cyber-cyan mb-4 shadow-glow-cyan animate-pulse">
              <Zap size={40} />
            </div>
            <h3 className="text-2xl font-black text-white tracking-tight mb-2">DROP CATCHER</h3>
            <p className="text-xs text-slate-300 max-w-xs mb-6">
              Catch gold coins (<span className="text-cyber-gold font-bold">+10 NC</span>) & cyan gems (
              <span className="text-cyber-cyan font-bold">+25 NC</span>). Dodge red hazards (
              <span className="text-cyber-red font-bold">-15 NC</span>). Earn real micro-TON every round!
            </p>

            {error && (
              <div className="mb-4 text-xs text-cyber-red bg-cyber-red/10 border border-cyber-red/30 p-2 rounded-xl flex items-center space-x-1">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleStart}
              className="py-3.5 px-8 rounded-2xl bg-gradient-to-r from-cyber-cyan to-cyber-blue text-cyber-bg font-extrabold text-sm tracking-wide shadow-glow-cyan active:scale-95 transition-all flex items-center space-x-2"
            >
              <Play size={18} />
              <span>START 30s ROUND</span>
            </button>
          </div>
        )}

        {gameState === 'finished' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-cyber-bg/95 backdrop-blur-md">
            <div className="w-16 h-16 rounded-full bg-cyber-gold/20 flex items-center justify-center text-cyber-gold mb-3 shadow-glow-gold">
              <Trophy size={32} />
            </div>
            <h3 className="text-2xl font-black text-white mb-1">ROUND COMPLETED!</h3>
            <p className="text-xs text-slate-400 mb-4">Final Score: {score}</p>

            {submitting ? (
              <div className="text-xs text-cyber-cyan animate-pulse">Verifying anti-cheat & crediting rewards...</div>
            ) : rewards ? (
              <div className="w-full max-w-xs glass-panel p-4 rounded-2xl border border-cyber-cyan/40 mb-6 space-y-2">
                <div className="text-xs text-slate-400 uppercase font-semibold">Rewards Claimed</div>
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-slate-300">NC Coins:</span>
                  <span className="text-cyber-gold font-mono">+{rewards.ncAwarded} NC</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-slate-300">TON Crypto:</span>
                  <span className="text-cyber-cyan font-mono">+{rewards.tonAwarded} TON</span>
                </div>
              </div>
            ) : error ? (
              <div className="text-xs text-cyber-red mb-4">{error}</div>
            ) : null}

            <button
              onClick={handleStart}
              className="py-3 px-6 rounded-2xl bg-cyber-card hover:bg-cyber-surface border border-cyber-cyan/50 text-cyber-cyan font-bold text-xs tracking-wider flex items-center space-x-2 active:scale-95 transition-all"
            >
              <RotateCcw size={16} />
              <span>PLAY AGAIN</span>
            </button>
          </div>
        )}

        <canvas ref={canvasRef} className="w-full h-full touch-none cursor-ew-resize" />
      </div>

      <div className="text-[11px] text-slate-500 mt-2 font-mono">
        💡 Drag or touch to slide collector • Haptic vibrations enabled
      </div>
    </div>
  );
};
