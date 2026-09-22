import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../services/api.js';
import { useTelegram } from '../../hooks/useTelegram.js';
import { ArrowLeft, Clock, Zap, RotateCcw, Award, CheckCircle2, AlertCircle, Loader2, ArrowBigLeft, ArrowBigRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CarRaceGameProps {
  onBack: () => void;
  onFinished: (ncAwarded: number, tonAwarded: string) => void;
}

interface Obstacle {
  id: number;
  lane: number; // 0, 1, 2
  y: number;
  type: 'car' | 'battery';
  speed: number;
}

const TOTAL_LANES = 3;
const GAME_DURATION_SEC = 30;

export const CarRaceGame: React.FC<CarRaceGameProps> = ({ onBack, onFinished }) => {
  const { haptic } = useTelegram();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [playerLane, setPlayerLane] = useState<number>(1); // Middle lane
  const [score, setScore] = useState<number>(0);
  const [fuel, setFuel] = useState<number>(100); // 0-100%
  const [timeLeft, setTimeLeft] = useState<number>(GAME_DURATION_SEC);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<'loading' | 'playing' | 'survived' | 'crashed' | 'submitting'>('loading');
  const [rewardClaim, setRewardClaim] = useState<{ nc: number; ton: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Refs for requestAnimationFrame loop
  const playerLaneRef = useRef<number>(1);
  const fuelRef = useRef<number>(100);
  const scoreRef = useRef<number>(0);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const animFrameIdRef = useRef<number>(0);
  const roadOffsetRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);
  const nextObstacleIdRef = useRef<number>(1);
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<any>(null);

  // Sync state refs
  useEffect(() => {
    playerLaneRef.current = playerLane;
  }, [playerLane]);

  // Steer controls
  const steerLeft = useCallback(() => {
    if (gameState !== 'playing') return;
    setPlayerLane((prev) => {
      const next = Math.max(0, prev - 1);
      if (next !== prev) haptic('light');
      return next;
    });
  }, [gameState, haptic]);

  const steerRight = useCallback(() => {
    if (gameState !== 'playing') return;
    setPlayerLane((prev) => {
      const next = Math.min(TOTAL_LANES - 1, prev + 1);
      if (next !== prev) haptic('light');
      return next;
    });
  }, [gameState, haptic]);

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        steerLeft();
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        steerRight();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [steerLeft, steerRight, gameState]);

  // Initialize Game Session
  const initGame = useCallback(async () => {
    try {
      setGameState('loading');
      setErrorMsg(null);
      setRewardClaim(null);
      setPlayerLane(1);
      playerLaneRef.current = 1;
      setFuel(100);
      fuelRef.current = 100;
      setScore(0);
      scoreRef.current = 0;
      setTimeLeft(GAME_DURATION_SEC);
      obstaclesRef.current = [];
      roadOffsetRef.current = 0;
      lastSpawnRef.current = Date.now();

      const res = await api.startGame('game_carrace');
      setSessionId(res.sessionId);
      startTimeRef.current = Date.now();
      setGameState('playing');
    } catch (err) {
      setErrorMsg((err as Error).message || 'Failed to start game session');
      setGameState('crashed');
    }
  }, []);

  useEffect(() => {
    initGame();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [initGame]);

  // Handle Finish Submission (After 30s survival)
  const handleFinish = useCallback(async () => {
    if (!sessionId) return;
    setGameState('submitting');
    haptic('success');

    try {
      // Ensure server anti-cheat threshold (>= 28s)
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      if (elapsed < 28.5) {
        const waitMs = Math.ceil((28.5 - elapsed) * 1000);
        await new Promise((r) => setTimeout(r, waitMs));
      }

      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
      });

      const finalScore = scoreRef.current + Math.round(fuelRef.current);
      const res = await api.finishGame(sessionId, finalScore);

      const nc = res.reward?.nc ?? res.ncAwarded ?? 50;
      const ton = res.reward?.ton ?? res.tonAwarded ?? '0.000025';

      setRewardClaim({ nc, ton });
      setGameState('survived');
      onFinished(nc, ton);
    } catch (err) {
      setErrorMsg((err as Error).message || 'Verification rejected');
      setGameState('crashed');
      haptic('error');
    }
  }, [sessionId, onFinished, haptic]);

  // Countdown timer
  useEffect(() => {
    if (gameState !== 'playing') return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, handleFinish]);

  // Main Canvas Rendering and Animation Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;

      const width = canvas.width;
      const height = canvas.height;
      const laneWidth = width / TOTAL_LANES;

      // 1. Draw Asphalt Road Background
      ctx.fillStyle = '#080c14';
      ctx.fillRect(0, 0, width, height);

      // Road side borders
      ctx.fillStyle = '#00f0ff22';
      ctx.fillRect(0, 0, 6, height);
      ctx.fillRect(width - 6, 0, 6, height);

      // 2. Draw Moving Lane Dividers
      roadOffsetRef.current = (roadOffsetRef.current + 5) % 40;
      ctx.strokeStyle = '#00f0ff44';
      ctx.lineWidth = 2;
      ctx.setLineDash([20, 20]);
      ctx.lineDashOffset = -roadOffsetRef.current;

      for (let i = 1; i < TOTAL_LANES; i++) {
        ctx.beginPath();
        ctx.moveTo(i * laneWidth, 0);
        ctx.lineTo(i * laneWidth, height);
        ctx.stroke();
      }
      ctx.setLineDash([]); // Reset line dash

      // 3. Spawn Obstacles
      const now = Date.now();
      if (now - lastSpawnRef.current > 750) {
        lastSpawnRef.current = now;
        const randomLane = Math.floor(Math.random() * TOTAL_LANES);
        const isBattery = Math.random() < 0.4; // 40% battery fuel, 60% red traffic car

        obstaclesRef.current.push({
          id: nextObstacleIdRef.current++,
          lane: randomLane,
          y: -40,
          type: isBattery ? 'battery' : 'car',
          speed: isBattery ? 3.5 : 4.5,
        });
      }

      // 4. Update and Draw Obstacles
      const playerY = height - 70;
      const playerX = playerLaneRef.current * laneWidth + laneWidth / 2;

      for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
        const obs = obstaclesRef.current[i];
        obs.y += obs.speed;
        const obsX = obs.lane * laneWidth + laneWidth / 2;

        if (obs.type === 'car') {
          // Draw Red Traffic Car
          ctx.save();
          ctx.fillStyle = '#ef4444';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.roundRect(obsX - 16, obs.y - 25, 32, 50, 6);
          ctx.fill();

          // Car windshield & headlights
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(obsX - 12, obs.y - 12, 24, 10);
          ctx.fillStyle = '#fde047';
          ctx.fillRect(obsX - 14, obs.y + 18, 6, 4);
          ctx.fillRect(obsX + 8, obs.y + 18, 6, 4);
          ctx.restore();
        } else {
          // Draw Yellow Battery Cell
          ctx.save();
          ctx.fillStyle = '#f59e0b';
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.roundRect(obsX - 12, obs.y - 18, 24, 36, 4);
          ctx.fill();
          // Battery tip
          ctx.fillStyle = '#fef3c7';
          ctx.fillRect(obsX - 5, obs.y - 23, 10, 5);
          // Bolt symbol inside
          ctx.fillStyle = '#1e1b4b';
          ctx.font = 'bold 16px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⚡', obsX, obs.y);
          ctx.restore();
        }

        // Collision Check with Player Vehicle
        const distY = Math.abs(obs.y - playerY);
        if (obs.lane === playerLaneRef.current && distY < 42) {
          if (obs.type === 'car') {
            // Collision with Red Car: Deduct fuel/points + Error haptic
            haptic('error');
            fuelRef.current = Math.max(0, fuelRef.current - 25);
            setFuel(fuelRef.current);
            scoreRef.current = Math.max(0, scoreRef.current - 10);
            setScore(scoreRef.current);

            // Screen flash effect
            ctx.fillStyle = '#ef444444';
            ctx.fillRect(0, 0, width, height);

            if (fuelRef.current <= 0) {
              isRunning = false;
              setGameState('crashed');
              return;
            }
          } else {
            // Collected Battery: Add fuel + Score + Light haptic
            haptic('light');
            fuelRef.current = Math.min(100, fuelRef.current + 15);
            setFuel(fuelRef.current);
            scoreRef.current += 20;
            setScore(scoreRef.current);
          }

          // Remove collided obstacle
          obstaclesRef.current.splice(i, 1);
          continue;
        }

        // Remove off-screen obstacles
        if (obs.y > height + 50) {
          obstaclesRef.current.splice(i, 1);
          scoreRef.current += 2;
          setScore(scoreRef.current);
        }
      }

      // 5. Draw Cyber Cyan Player Vehicle
      ctx.save();
      // Vehicle Body
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.roundRect(playerX - 18, playerY - 26, 36, 52, 8);
      ctx.fill();

      // Cockpit / Windshield
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.roundRect(playerX - 13, playerY - 14, 26, 20, 4);
      ctx.fill();

      // Neon Thruster Glow at rear
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.fillRect(playerX - 12, playerY + 26, 7, 5);
      ctx.fillRect(playerX + 5, playerY + 26, 7, 5);
      ctx.restore();

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [gameState, haptic]);

  return (
    <div className="w-full flex flex-col items-center select-none">
      {/* Top Bar: Back Button, Timer, Stats */}
      <div className="w-full flex items-center justify-between py-2 mb-2">
        <button
          onClick={onBack}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyber-card border border-cyber-border text-xs text-slate-300 hover:text-white transition-all active:scale-95"
        >
          <ArrowLeft size={14} />
          <span>HUB</span>
        </button>

        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-cyber-bg border border-cyber-border font-mono text-xs">
            <Clock size={13} className={timeLeft <= 5 ? 'text-cyber-red animate-pulse' : 'text-cyber-gold'} />
            <span className={timeLeft <= 5 ? 'text-cyber-red font-bold' : 'text-slate-200 font-bold'}>
              {timeLeft}s
            </span>
          </div>

          <div className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-cyber-card border border-cyber-border font-mono text-xs">
            <Zap size={13} className="text-cyber-gold" />
            <span className="text-cyber-gold font-bold">{score}</span>
          </div>
        </div>
      </div>

      {/* Fuel / Health Bar */}
      <div className="w-full glass-panel p-2 rounded-xl border border-cyber-border mb-3 flex items-center space-x-2.5 text-xs">
        <span className="font-mono text-[10px] text-slate-400 font-bold uppercase">FUEL</span>
        <div className="flex-1 h-2.5 rounded-full bg-cyber-bg border border-cyber-border overflow-hidden">
          <div
            className={`h-full transition-all duration-200 ${
              fuel > 50 ? 'bg-cyber-cyan shadow-glow-cyan' : fuel > 25 ? 'bg-cyber-gold shadow-glow-gold' : 'bg-cyber-red shadow-glow-red'
            }`}
            style={{ width: `${fuel}%` }}
          />
        </div>
        <span className="font-mono text-xs font-bold text-slate-200">{fuel}%</span>
      </div>

      {/* Loading State */}
      {gameState === 'loading' && (
        <div className="w-full h-80 flex flex-col items-center justify-center glass-panel rounded-2xl border border-cyber-border">
          <Loader2 size={32} className="animate-spin text-cyber-gold mb-3" />
          <p className="text-xs font-mono text-slate-300">CALIBRATING SPEEDWAY TELEMETRY...</p>
        </div>
      )}

      {/* Submitting State */}
      {gameState === 'submitting' && (
        <div className="w-full h-80 flex flex-col items-center justify-center glass-panel rounded-2xl border border-cyber-border text-center p-4">
          <Loader2 size={36} className="animate-spin text-cyber-gold mb-3" />
          <h3 className="text-sm font-bold text-white tracking-wide">CONFIRMING SPEEDWAY PROOF</h3>
          <p className="text-xs font-mono text-slate-400 mt-1">Verifying 30-second survival log on nodes...</p>
        </div>
      )}

      {/* Active Game Canvas */}
      {(gameState === 'playing' || gameState === 'survived' || gameState === 'crashed') && (
          <div className="w-full flex flex-col items-center">
            {/* Canvas Container */}
            <div className="relative rounded-2xl overflow-hidden border-2 border-cyber-border shadow-2xl bg-black">
              <canvas
                ref={canvasRef}
                width={320}
                height={380}
                className="block touch-none"
              />
            </div>

            {/* Steering Buttons */}
            {gameState === 'playing' && (
              <div className="grid grid-cols-2 gap-3 w-full max-w-xs mt-3.5">
                <button
                  onClick={steerLeft}
                  disabled={playerLane === 0}
                  className="py-3.5 rounded-2xl bg-cyber-card/90 hover:bg-cyber-card border border-cyber-cyan/50 hover:border-cyber-cyan active:scale-95 text-cyber-cyan font-bold flex items-center justify-center space-x-1.5 shadow-glow-cyan/20 transition-all disabled:opacity-30"
                >
                  <ArrowBigLeft size={22} />
                  <span className="text-xs font-mono">STEER LEFT</span>
                </button>

                <button
                  onClick={steerRight}
                  disabled={playerLane === TOTAL_LANES - 1}
                  className="py-3.5 rounded-2xl bg-cyber-card/90 hover:bg-cyber-card border border-cyber-cyan/50 hover:border-cyber-cyan active:scale-95 text-cyber-cyan font-bold flex items-center justify-center space-x-1.5 shadow-glow-cyan/20 transition-all disabled:opacity-30"
                >
                  <span className="text-xs font-mono">STEER RIGHT</span>
                  <ArrowBigRight size={22} />
                </button>
              </div>
            )}

            {/* Survived Modal Overlay */}
            {gameState === 'survived' && rewardClaim && (
              <div className="w-full glass-panel p-5 rounded-2xl border border-cyber-gold/60 mt-4 text-center animate-in fade-in duration-300">
                <div className="w-12 h-12 rounded-2xl bg-cyber-gold/20 border border-cyber-gold text-cyber-gold flex items-center justify-center mx-auto mb-2.5 shadow-glow-gold">
                  <CheckCircle2 size={26} />
                </div>
                <h3 className="text-base font-bold text-white tracking-wide">ROUND SURVIVED!</h3>
                <p className="text-xs text-slate-300 mt-1">30s highway run completed with {score} pts.</p>

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
                    className="flex-1 py-2.5 px-3 rounded-xl bg-cyber-card border border-cyber-border text-xs font-bold text-white hover:border-cyber-gold flex items-center justify-center space-x-1.5 transition-all"
                  >
                    <RotateCcw size={14} />
                    <span>RACE AGAIN</span>
                  </button>
                  <button
                    onClick={onBack}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-cyber-gold text-slate-950 text-xs font-bold flex items-center justify-center space-x-1.5 shadow-glow-gold transition-all"
                  >
                    <Award size={14} />
                    <span>RETURN TO HUB</span>
                  </button>
                </div>
              </div>
            )}

            {/* Crashed / Error Overlay */}
            {gameState === 'crashed' && (
              <div className="w-full glass-panel p-5 rounded-2xl border border-cyber-red/50 mt-4 text-center animate-in fade-in duration-300">
                <div className="w-12 h-12 rounded-2xl bg-cyber-red/20 border border-cyber-red text-cyber-red flex items-center justify-center mx-auto mb-2.5">
                  <AlertCircle size={26} />
                </div>
                <h3 className="text-base font-bold text-white tracking-wide">
                  {errorMsg ? 'VERIFICATION REJECTED' : 'VEHICLE CRASHED'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {errorMsg || 'Fuel depleted or collision damage exceeded safety tolerances.'}
                </p>

                <div className="flex items-center space-x-2 mt-4">
                  <button
                    onClick={initGame}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-cyber-card border border-cyber-border text-xs font-bold text-white hover:border-cyber-cyan flex items-center justify-center space-x-1.5 transition-all"
                  >
                    <RotateCcw size={14} />
                    <span>TRY AGAIN</span>
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
