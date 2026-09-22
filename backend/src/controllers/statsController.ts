import { Request, Response } from 'express';

// In-memory presence tracking for connected miners
interface ActiveMiner {
  id: string;
  lastSeen: number;
}

const activeMiners = new Map<string, ActiveMiner>();

// Base simulation metrics for global ecosystem presence
const BASE_ACTIVE_PLAYERS = 1280;
const PEAK_24H_PLAYERS = 3840;

// Organic jitter state for natural real-time fluctuation
let cachedFluctuation = 0;
let lastFluctuationUpdate = Date.now();

function getLiveOnlineCount(): { onlineCount: number; peak24h: number; realActive: number } {
  const now = Date.now();

  // Prune inactive sessions older than 2 minutes (120,000 ms)
  for (const [id, miner] of activeMiners.entries()) {
    if (now - miner.lastSeen > 120000) {
      activeMiners.delete(id);
    }
  }

  // Update organic jitter every 4 seconds (-3 to +4 change)
  if (now - lastFluctuationUpdate > 4000) {
    const delta = Math.floor(Math.random() * 8) - 3; // -3 to +4
    cachedFluctuation = Math.max(-120, Math.min(180, cachedFluctuation + delta));
    lastFluctuationUpdate = now;
  }

  // Circadian time-of-day curve (UTC hours)
  const currentHour = new Date().getUTCHours();
  const timeOfDayModifier = Math.round(Math.sin(((currentHour - 8) * Math.PI) / 12) * 160);

  const realActive = activeMiners.size;
  const simulatedActive = BASE_ACTIVE_PLAYERS + timeOfDayModifier + cachedFluctuation;
  const totalOnline = Math.max(12, simulatedActive + realActive);

  const peak = Math.max(PEAK_24H_PLAYERS, totalOnline + 350);

  return {
    onlineCount: totalOnline,
    peak24h: peak,
    realActive,
  };
}

/**
 * GET /api/stats/online
 * Public endpoint to fetch real-time online players telemetry
 */
export function getOnlineStats(req: Request, res: Response) {
  try {
    const stats = getLiveOnlineCount();
    return res.json({
      success: true,
      onlineCount: stats.onlineCount,
      peak24h: stats.peak24h,
      activeRealUsers: stats.realActive,
      timestamp: Date.now(),
      status: 'healthy',
    });
  } catch (err: any) {
    console.error('Error fetching online stats:', err);
    return res.status(500).json({ error: 'Failed to fetch online stats', message: err.message });
  }
}

/**
 * POST /api/stats/ping
 * Heartbeat ping from clients to register active presence
 */
export function pingOnlineStatus(req: Request, res: Response) {
  try {
    const rawUserId = req.telegramUser?.id || req.body?.userId || req.ip || 'anonymous';
    const userId = String(rawUserId);

    activeMiners.set(userId, {
      id: userId,
      lastSeen: Date.now(),
    });

    const stats = getLiveOnlineCount();
    return res.json({
      success: true,
      onlineCount: stats.onlineCount,
      peak24h: stats.peak24h,
      activeRealUsers: stats.realActive,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    console.error('Error processing presence ping:', err);
    return res.status(500).json({ error: 'Presence ping failed', message: err.message });
  }
}
