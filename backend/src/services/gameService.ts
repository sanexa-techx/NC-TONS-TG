import crypto from 'crypto';
import { prisma } from '../db/db.js';
import { Decimal } from '@prisma/client/runtime/library';

export type ValidGameType = 'game_memory' | 'game_2048' | 'game_carrace';

export const VALID_GAME_TYPES: ValidGameType[] = ['game_memory', 'game_2048', 'game_carrace'];

// Anti-cheat minimum time threshold in seconds
export const TIMING_THRESHOLDS: Record<ValidGameType, number> = {
  game_memory: 10,   // Minimum 10 seconds
  game_carrace: 28,  // Minimum 28 seconds (rounds last 30s)
  game_2048: 20,     // Minimum 20 seconds
};

const DEFAULT_REWARDS: Record<ValidGameType, { nc: number; ton: Decimal }> = {
  game_memory: { nc: 45, ton: new Decimal('0.000015') },
  game_2048: { nc: 60, ton: new Decimal('0.000020') },
  game_carrace: { nc: 50, ton: new Decimal('0.000025') },
};

export class GameService {
  /**
   * Starts a new game session and stores it in game_sessions
   */
  static async startSession(
    userId: bigint,
    gameType: string
  ): Promise<{ sessionId: string }> {
    if (!VALID_GAME_TYPES.includes(gameType as ValidGameType)) {
      throw new Error(`Invalid gameType '${gameType}'. Must be one of: ${VALID_GAME_TYPES.join(', ')}`);
    }

    const sessionId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(24).toString('hex');
    const startedAt = new Date();

    await prisma.gameSession.create({
      data: {
        id: sessionId,
        user_id: userId,
        game_type: gameType,
        status: 'ACTIVE',
        started_at: startedAt,
      },
    });

    return { sessionId };
  }

  /**
   * Finishes an active game round, enforces anti-cheat thresholds, marks completed, and awards tokens
   */
  static async finishSession(
    userId: bigint,
    sessionId: string,
    score: number
  ): Promise<{
    success: boolean;
    reward: { nc: number; ton: string };
    newBalances: { nc: string; ton: string };
    ncAwarded: number;
    tonAwarded: string;
    newNcBalance: string;
    newTonBalance: string;
  }> {
    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Invalid or expired game session');
    }

    if (session.user_id.toString() !== userId.toString()) {
      throw new Error('Session does not belong to the authenticated user');
    }

    if (session.status !== 'ACTIVE') {
      throw new Error('Game session is already finished or closed');
    }

    // Invalidate session immediately to prevent replay attacks
    await prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        finished_at: new Date(),
        score: Math.max(0, Math.floor(score)),
      },
    });

    const now = Date.now();
    const startedTime = new Date(session.started_at).getTime();
    const elapsedSeconds = (now - startedTime) / 1000;

    const gameType = session.game_type as ValidGameType;
    const minThresholdSec = TIMING_THRESHOLDS[gameType] ?? 10;

    if (elapsedSeconds < minThresholdSec) {
      throw new Error(
        `Round completed too quickly (${elapsedSeconds.toFixed(1)}s < ${minThresholdSec}s). Anti-cheat triggered.`
      );
    }

    // Query current rates from reward_configs for this specific game type
    const config = await prisma.rewardConfig.findUnique({
      where: { action_type: gameType },
    });

    const ncReward = config ? config.nc_reward : DEFAULT_REWARDS[gameType].nc;
    const tonReward = config
      ? (config.ton_reward instanceof Decimal ? config.ton_reward : new Decimal(config.ton_reward))
      : DEFAULT_REWARDS[gameType].ton;

    const tonRewardStr = tonReward.toFixed(6);

    // Atomically credit nc_balance and ton_balance to user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        nc_balance: { increment: BigInt(ncReward) },
        ton_balance: { increment: tonReward },
      },
    });

    const newNcBal = updatedUser.nc_balance.toString();
    const newTonBal = updatedUser.ton_balance instanceof Decimal
      ? updatedUser.ton_balance.toFixed(6)
      : Number(updatedUser.ton_balance).toFixed(6);

    return {
      success: true,
      reward: {
        nc: ncReward,
        ton: tonRewardStr,
      },
      newBalances: {
        nc: newNcBal,
        ton: newTonBal,
      },
      ncAwarded: ncReward,
      tonAwarded: tonRewardStr,
      newNcBalance: newNcBal,
      newTonBalance: newTonBal,
    };
  }
}
