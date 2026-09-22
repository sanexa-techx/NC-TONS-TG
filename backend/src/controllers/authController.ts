import { Request, Response } from 'express';
import { prisma } from '../db/db.js';
import { MiningService } from '../services/miningService.js';
import { isAdmin } from '../config/env.js';

export async function verifyAuth(req: Request, res: Response) {
  try {
    const telegramUser = req.telegramUser;
    if (!telegramUser) {
      return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
    }

    const userId = telegramUser.id;

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          first_name: telegramUser.first_name,
          username: telegramUser.username || null,
          ton_balance: 0,
          nc_balance: 100, // New user bonus
          power_percentage: 100,
          power_capacity_hours: 8,
          ton_hashrate_per_sec: 0.00000100,
        },
      });
    }

    // Sync mining state to get fresh balances
    const miningState = await MiningService.syncMining(userId);

    return res.json({
      user: {
        id: user.id.toString(),
        firstName: user.first_name,
        username: user.username,
        isAdmin: isAdmin(userId),
      },
      mining: miningState,
    });
  } catch (err) {
    console.error('Error in auth verify:', err);
    return res.status(500).json({ error: 'Internal server error', message: (err as Error).message });
  }
}
