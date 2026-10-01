import { Router, Request, Response } from 'express';
import { pool } from '../db/db.js';

const router = Router();

// Base hashrate increment per level (Level 1 = 0.00000020, Level 2 = 0.00000040, Level 3 = 0.00000060, etc.)
export const BASE_HASHRATE_INCREMENT = 0.00000020;
export const ADS_REQUIRED_FOR_LEVEL_UP = 50;
export const MAX_WITHDRAW_FOR_LEVEL_1 = 0.5000;

export function getHashrateForLevel(level: number): string {
  const effectiveLevel = Math.max(1, level || 1);
  return (effectiveLevel * BASE_HASHRATE_INCREMENT).toFixed(8);
}

// 1. GET /api/level/status - Get current level status, ad progress, and perks
router.get('/status', async (req: Request, res: Response) => {
  const userId = req.telegramUser?.id || req.headers['x-telegram-user-id'] || req.headers['x-dev-telegram-id'] || req.query.userId;
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    const userRes = await pool.query(
      `SELECT id, miner_level, ton_hashrate_per_sec, 
              (last_level_up_date = CURRENT_DATE) as has_leveled_up_today,
              last_level_up_date
       FROM users 
       WHERE id = $1`,
      [userId]
    );

    const user = userRes.rows[0];
    const currentLevel = user ? (Number(user.miner_level) || 1) : 1;
    const nextLevel = currentLevel + 1;
    const currentHashrate = getHashrateForLevel(currentLevel);
    const nextHashrate = getHashrateForLevel(nextLevel);
    const hasLeveledUpToday = Boolean(user?.has_leveled_up_today);

    // Fetch today's ads watched from user_daily_ads
    const adsRes = await pool.query(
      `SELECT adsgram_count, monetag_count 
       FROM user_daily_ads 
       WHERE user_id = $1 AND ad_date = CURRENT_DATE`,
      [userId]
    );
    const adCounts = adsRes.rows[0] || { adsgram_count: 0, monetag_count: 0 };
    const adsgramWatched = Number(adCounts.adsgram_count || 0);
    const monetagWatched = Number(adCounts.monetag_count || 0);
    const adsWatchedToday = adsgramWatched + monetagWatched;
    const adsRemaining = Math.max(0, ADS_REQUIRED_FOR_LEVEL_UP - adsWatchedToday);
    const progressPercent = Math.min(100, Math.round((adsWatchedToday / ADS_REQUIRED_FOR_LEVEL_UP) * 100));

    const canLevelUp = adsWatchedToday >= ADS_REQUIRED_FOR_LEVEL_UP && !hasLeveledUpToday;

    return res.json({
      success: true,
      currentLevel,
      nextLevel,
      currentHashrate,
      nextHashrate,
      adsWatchedToday,
      adsgramWatched,
      monetagWatched,
      adsRequired: ADS_REQUIRED_FOR_LEVEL_UP,
      adsRemaining,
      progressPercent,
      canLevelUp,
      hasLeveledUpToday,
      maxWithdrawTon: currentLevel >= 2 ? null : MAX_WITHDRAW_FOR_LEVEL_1,
      canWithdrawOverHalfTon: currentLevel >= 2,
    });
  } catch (err: any) {
    console.error('Level status error:', err);
    return res.status(500).json({ error: 'Failed to fetch level status' });
  }
});

// 2. POST /api/level/upgrade - Level up when 50 ads watched today
router.post('/upgrade', async (req: Request, res: Response) => {
  const userId = req.telegramUser?.id || req.headers['x-telegram-user-id'] || req.headers['x-dev-telegram-id'] || req.body.userId;
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock user record
    const userRes = await client.query(
      `SELECT id, miner_level, ton_hashrate_per_sec, 
              (last_level_up_date = CURRENT_DATE) as has_leveled_up_today
       FROM users 
       WHERE id = $1 FOR UPDATE`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRes.rows[0];
    const currentLevel = Number(user.miner_level) || 1;

    // Check if already leveled up today
    if (user.has_leveled_up_today) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'You have already upgraded your rig level today! Watch 50 ads tomorrow to level up again.',
      });
    }

    // Check today's ad views
    const adsRes = await client.query(
      `SELECT adsgram_count, monetag_count 
       FROM user_daily_ads 
       WHERE user_id = $1 AND ad_date = CURRENT_DATE`,
      [userId]
    );

    const adCounts = adsRes.rows[0] || { adsgram_count: 0, monetag_count: 0 };
    const adsWatchedToday = Number(adCounts.adsgram_count || 0) + Number(adCounts.monetag_count || 0);

    if (adsWatchedToday < ADS_REQUIRED_FOR_LEVEL_UP) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Level up requirement not met. You must watch 50 ads in one day (currently ${adsWatchedToday}/${ADS_REQUIRED_FOR_LEVEL_UP}).`,
        details: {
          adsWatchedToday,
          adsRequired: ADS_REQUIRED_FOR_LEVEL_UP,
          adsRemaining: ADS_REQUIRED_FOR_LEVEL_UP - adsWatchedToday,
        },
      });
    }

    const newLevel = currentLevel + 1;
    const newHashrate = getHashrateForLevel(newLevel);
    const bonusNc = 500; // 500 NC Fuel bonus for leveling up!

    await client.query(
      `UPDATE users 
       SET miner_level = $1, 
           ton_hashrate_per_sec = $2, 
           last_level_up_date = CURRENT_DATE,
           nc_balance = nc_balance + $3
       WHERE id = $4`,
      [newLevel, newHashrate, bonusNc, userId]
    );

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: `🎉 Rig successfully upgraded to Level ${newLevel}! Mining hashrate boosted to ${newHashrate} TON/s!`,
      newLevel,
      newHashrate,
      bonusNc,
      canWithdrawOverHalfTon: newLevel >= 2,
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Level upgrade error:', err);
    return res.status(500).json({ error: 'Failed to process level upgrade' });
  } finally {
    client.release();
  }
});

export default router;
