import crypto from 'crypto';
import { prisma } from '../db/db.js';
import { Decimal } from '@prisma/client/runtime/library';

interface GameSession {
  sessionId: string;
  userId: string;
  startedAt: number;
  expiresAt: number;
}

// In-memory active game session store
const activeSessions = new Map<string, GameSession>();

// Periodically clean up expired sessions
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of activeSessions.entries()) {
    if (session.expiresAt < now) {
      activeSessions.delete(id);
    }
  }
}, 60 * 1000);

export class GameService {
  /**
   * Starts a drop catcher game round and issues an anti-cheat session token
   */
  static startSession(userId: bigint): { sessionId: string; durationSec: number } {
    const sessionId = crypto.randomBytes(24).toString('hex');
    const now = Date.now();
    const durationSec = 30;

    activeSessions.set(sessionId, {
      sessionId,
      userId: userId.toString(),
      startedAt: now,
      expiresAt: now + 60 * 1000, // 60s max before session expires
    });

    return { sessionId, durationSec };
  }

  /**
   * Finishes a game round, verifies anti-cheat constraints, and awards dual currency
   */
  static async finishSession(
    userId: bigint,
    sessionId: string,
    score: number
  ): Promise<{ ncAwarded: number; tonAwarded: string; newNcBalance: string; newTonBalance: string }> {
    const session = activeSessions.get(sessionId);

    if (!session) {
      throw new Error('Invalid or expired game session');
    }

    if (session.userId !== userId.toString()) {
      throw new Error('Session does not belong to the user');
    }

    // Invalidate session immediately to prevent replay attacks
    activeSessions.delete(sessionId);

    const now = Date.now();
    const elapsedSeconds = (now - session.startedAt) / 1000;

    // Server-enforced anti-cheat: round must last at least 28s
    if (elapsedSeconds < 28) {
      throw new Error(`Round completed too quickly (${elapsedSeconds.toFixed(1)}s < 28s). Anti-cheat triggered.`);
    }

    // Score ceiling check: impossible to get > 1000 score in 30s
    if (score < 0 || score > 1000) {
      throw new Error(`Unrealistic score (${score}). Anti-cheat triggered.`);
    }

    // Fetch dynamic reward configuration
    const config = await prisma.rewardConfig.findUnique({
      where: { action_type: 'game_play' },
    });

    const baseNcReward = config ? config.nc_reward : 150;
    const baseTonReward = config ? config.ton_reward : new Decimal('0.000050');

    // Total NC awarded is base reward + proportion of game score
    const totalNcAwarded = Math.max(10, Math.round(baseNcReward + score));
    const totalTonAwarded = baseTonReward;

    // Credit rewards atomically
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        nc_balance: { increment: BigInt(totalNcAwarded) },
        ton_balance: { increment: totalTonAwarded },
      },
    });

    return {
      ncAwarded: totalNcAwarded,
      tonAwarded: totalTonAwarded.toFixed(6),
      newNcBalance: updatedUser.nc_balance.toString(),
      newTonBalance: updatedUser.ton_balance.toFixed(6),
    };
  }
}
