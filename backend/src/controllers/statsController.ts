import { Request, Response } from 'express';

// In-memory presence tracking for actual real connected miners
interface ActiveMiner {
  id: string;
  lastSeen: number;
}

const activeMiners = new Map<string, ActiveMiner>();
let peak24h = 1;
const SESSION_TIMEOUT_MS = 45000; // 45 seconds timeout without a heartbeat

function pruneInactiveMiners(): number {
  const now = Date.now();
  for (const [id, miner] of activeMiners.entries()) {
    if (now - miner.lastSeen > SESSION_TIMEOUT_MS) {
      activeMiners.delete(id);
    }
  }
  const realCount = activeMiners.size;
  if (realCount > peak24h) {
    peak24h = realCount;
  }
  return realCount;
}

/**
 * GET /api/stats/online
 * Public endpoint returning strictly actual real online users
 */
export function getOnlineStats(req: Request, res: Response) {
  try {
    const realOnline = pruneInactiveMiners();
    return res.json({
      success: true,
      onlineCount: realOnline,
      peak24h: Math.max(realOnline, peak24h),
      activeRealUsers: realOnline,
      timestamp: Date.now(),
      status: 'healthy',
    });
  } catch (err: any) {
    console.error('Error fetching real online stats:', err);
    return res.status(500).json({ error: 'Failed to fetch online stats', message: err.message });
  }
}

/**
 * POST /api/stats/ping
 * Heartbeat ping from clients registering actual real presence
 */
export function pingOnlineStatus(req: Request, res: Response) {
  try {
    const rawUserId = req.telegramUser?.id || req.body?.userId || req.headers['x-dev-telegram-id'] || req.ip || 'user-1';
    const userId = String(rawUserId);

    // If client is signaling disconnect (e.g. on page unload)
    if (req.body?.action === 'leave') {
      activeMiners.delete(userId);
    } else {
      activeMiners.set(userId, {
        id: userId,
        lastSeen: Date.now(),
      });
    }

    const realOnline = pruneInactiveMiners();

    return res.json({
      success: true,
      onlineCount: realOnline,
      peak24h: Math.max(realOnline, peak24h),
      activeRealUsers: realOnline,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    console.error('Error processing real presence ping:', err);
    return res.status(500).json({ error: 'Presence ping failed', message: err.message });
  }
}
