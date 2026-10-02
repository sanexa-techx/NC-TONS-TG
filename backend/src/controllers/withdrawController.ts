import { Request, Response } from 'express';
import { prisma, pool } from '../db/db.js';
import { Decimal } from '@prisma/client/runtime/library';
import { sendWithdrawalApprovalCard } from '../bot/notifications.js';
import { syncWithdrawalToNotion } from '../services/notionService.js';

export const DAILY_WITHDRAWAL_LIMIT = 1;
export const WEEKLY_WITHDRAWAL_LIMIT = 5;
export const DAILY_ADS_REQUIRED_FOR_WITHDRAW = 30;
export const WEEKLY_ADS_REQUIRED_FOR_WITHDRAW = 100;

export const GATE_ADSGRAM_REQUIRED = 8;
export const GATE_MONETAG_REQUIRED = 4;

export async function getUserWithdrawalLimits(userId: bigint | number | string) {
  // 1. Check Gatekeeper (min 8 Adsgram & 4 Monetag)
  const adCheck = await pool.query(
    `SELECT adsgram_count, monetag_count, limit_ads_count, last_ad_at 
     FROM user_daily_ads 
     WHERE user_id = $1 AND ad_date = CURRENT_DATE`,
    [userId]
  );
  const counts = adCheck.rows[0] || { adsgram_count: 0, monetag_count: 0, limit_ads_count: 0 };
  const adsgramCount = Number(counts.adsgram_count || 0);
  const monetagCount = Number(counts.monetag_count || 0);
  const dailyLimitAds = Number(counts.limit_ads_count || 0);

  // Gate satisfies either 8 adsgram + 4 monetag or 8 monetag + 4 adsgram
  const isGateUnlocked =
    (adsgramCount >= GATE_ADSGRAM_REQUIRED && monetagCount >= GATE_MONETAG_REQUIRED) ||
    (adsgramCount >= GATE_MONETAG_REQUIRED && monetagCount >= GATE_ADSGRAM_REQUIRED);

  // 2. Sum weekly limit ads (from Monday UTC of current week)
  const weeklyAdsRes = await pool.query(
    `SELECT COALESCE(SUM(limit_ads_count), 0) as weekly_limit_ads 
     FROM user_daily_ads 
     WHERE user_id = $1 AND ad_date >= date_trunc('week', CURRENT_DATE)`,
    [userId]
  );
  const weeklyLimitAds = Number(weeklyAdsRes.rows[0]?.weekly_limit_ads || 0);

  // 3. Count withdrawals today (created_at >= CURRENT_DATE UTC, status != 'REJECTED')
  const todayWdRes = await pool.query(
    `SELECT COUNT(*) as count 
     FROM withdrawals 
     WHERE user_id = $1 AND created_at >= CURRENT_DATE AND status != 'REJECTED'`,
    [userId]
  );
  const todayWithdrawals = Number(todayWdRes.rows[0]?.count || 0);

  // 4. Count withdrawals this week (created_at >= date_trunc('week', CURRENT_DATE), status != 'REJECTED')
  const weeklyWdRes = await pool.query(
    `SELECT COUNT(*) as count 
     FROM withdrawals 
     WHERE user_id = $1 AND created_at >= date_trunc('week', CURRENT_DATE) AND status != 'REJECTED'`,
    [userId]
  );
  const weeklyWithdrawals = Number(weeklyWdRes.rows[0]?.count || 0);

  const isDailyUnlocked = dailyLimitAds >= DAILY_ADS_REQUIRED_FOR_WITHDRAW;
  const isWeeklyUnlocked = weeklyLimitAds >= WEEKLY_ADS_REQUIRED_FOR_WITHDRAW;

  const canWithdrawDaily = todayWithdrawals < DAILY_WITHDRAWAL_LIMIT && isDailyUnlocked;
  const canWithdrawWeekly = weeklyWithdrawals < WEEKLY_WITHDRAWAL_LIMIT && isWeeklyUnlocked;

  const canWithdraw = isGateUnlocked && canWithdrawDaily && canWithdrawWeekly;

  return {
    daily: {
      limit: DAILY_WITHDRAWAL_LIMIT,
      used: todayWithdrawals,
      remaining: Math.max(0, DAILY_WITHDRAWAL_LIMIT - todayWithdrawals),
      adsWatched: dailyLimitAds,
      adsRequired: DAILY_ADS_REQUIRED_FOR_WITHDRAW,
      isUnlocked: isDailyUnlocked,
    },
    weekly: {
      limit: WEEKLY_WITHDRAWAL_LIMIT,
      used: weeklyWithdrawals,
      remaining: Math.max(0, WEEKLY_WITHDRAWAL_LIMIT - weeklyWithdrawals),
      adsWatched: weeklyLimitAds,
      adsRequired: WEEKLY_ADS_REQUIRED_FOR_WITHDRAW,
      isUnlocked: isWeeklyUnlocked,
    },
    gate: {
      adsgramWatched: adsgramCount,
      adsgramRequired: GATE_ADSGRAM_REQUIRED,
      monetagWatched: monetagCount,
      monetagRequired: GATE_MONETAG_REQUIRED,
      isUnlocked: isGateUnlocked,
    },
    canWithdraw,
    lastAdAt: counts.last_ad_at,
  };
}

export async function getWithdrawalStatus(req: Request, res: Response) {
  try {
    const rawUserId =
      req.telegramUser?.id ||
      req.headers['x-telegram-user-id'] ||
      req.headers['x-dev-telegram-id'] ||
      req.query.userId;

    if (!rawUserId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const userId = rawUserId.toString();
    const limits = await getUserWithdrawalLimits(userId);

    const user = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
    });

    const userLevel = user ? (Number(user.miner_level) || 1) : 1;
    const canWithdrawOverHalfTon = userLevel >= 2;

    let blockReason: string | null = null;
    if (!limits.gate.isUnlocked) {
      blockReason = 'Daily withdrawal gate locked: Watch 8 Adsgram and 4 Monetag ads today';
    } else if (limits.daily.used >= limits.daily.limit) {
      blockReason = 'Daily limit reached: 1/1 withdrawal already made today';
    } else if (!limits.daily.isUnlocked) {
      blockReason = `Daily limit locked: Watch 30 ads today (${limits.daily.adsWatched}/30 watched)`;
    } else if (limits.weekly.used >= limits.weekly.limit) {
      blockReason = 'Weekly limit reached: 5/5 withdrawals already made this week';
    } else if (!limits.weekly.isUnlocked) {
      blockReason = `Weekly limit locked: Watch 100 ads this week (${limits.weekly.adsWatched}/100 watched)`;
    }

    return res.json({
      success: true,
      daily: limits.daily,
      weekly: limits.weekly,
      gate: limits.gate,
      level: {
        currentLevel: userLevel,
        canWithdrawOverHalfTon,
        maxWithdrawTon: canWithdrawOverHalfTon ? null : 0.5,
      },
      canWithdraw: limits.canWithdraw,
      blockReason,
    });
  } catch (err) {
    console.error('Error getting withdrawal status:', err);
    return res.status(500).json({ error: 'Failed to get withdrawal status' });
  }
}

export async function watchWithdrawalLimitAd(req: Request, res: Response) {
  try {
    const rawUserId =
      req.telegramUser?.id ||
      req.headers['x-telegram-user-id'] ||
      req.headers['x-dev-telegram-id'] ||
      req.body.userId;

    if (!rawUserId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const userId = rawUserId.toString();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO users (id, first_name)
         VALUES ($1, 'Miner')
         ON CONFLICT (id) DO NOTHING`,
        [userId]
      );

      await client.query(
        `INSERT INTO user_daily_ads (user_id, ad_date, adsgram_count, monetag_count, limit_ads_count)
         VALUES ($1, CURRENT_DATE, 0, 0, 0)
         ON CONFLICT (user_id, ad_date) DO NOTHING`,
        [userId]
      );

      const recordRes = await client.query(
        `SELECT adsgram_count, monetag_count, limit_ads_count, last_ad_at,
                EXTRACT(EPOCH FROM (NOW() - last_ad_at)) as seconds_since_last_ad
         FROM user_daily_ads 
         WHERE user_id = $1 AND ad_date = CURRENT_DATE FOR UPDATE`,
        [userId]
      );
      const counts = recordRes.rows[0];

      // Anti-spam cooldown (10s between claims)
      const secondsSince = counts?.seconds_since_last_ad != null
        ? Number(counts.seconds_since_last_ad)
        : (counts?.last_ad_at ? (Date.now() - new Date(counts.last_ad_at).getTime()) / 1000 : 999);

      if (Number(counts?.limit_ads_count || 0) > 0) {
        if (secondsSince < 10) {
          await client.query('ROLLBACK');
          const waitSec = Math.ceil(10 - secondsSince);
          return res.status(429).json({ error: `Please wait ${waitSec}s between ad watches` });
        }
      }

      // Increment limit_ads_count specifically (does NOT touch adsgram_count or monetag_count)
      await client.query(
        `UPDATE user_daily_ads 
         SET limit_ads_count = limit_ads_count + 1,
             last_ad_at = NOW()
         WHERE user_id = $1 AND ad_date = CURRENT_DATE`,
        [userId]
      );

      // Dual reward credit (+200 NC, +0.000250 TON)
      const ncReward = 200;
      const tonReward = 0.000250;
      await client.query(
        `UPDATE users 
         SET nc_balance = nc_balance + $1,
             ton_balance = ton_balance + $2
         WHERE id = $3`,
        [ncReward, tonReward, userId]
      );

      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    const limits = await getUserWithdrawalLimits(userId);

    return res.json({
      success: true,
      message: 'Ad verified! Progress added to daily and weekly withdrawal limit pass.',
      reward: { nc: 200, ton: 0.000250 },
      limits,
    });
  } catch (err) {
    console.error('Error claiming withdrawal limit ad:', err);
    return res.status(500).json({ error: 'Failed to record ad watch' });
  }
}

export async function requestWithdrawal(req: Request, res: Response) {
  try {
    const userId = req.telegramUser!.id;
    const { tonAddress, tonAmount } = req.body;

    if (!tonAddress || typeof tonAddress !== 'string' || tonAddress.length < 24) {
      return res.status(400).json({ error: 'Invalid TON wallet address' });
    }

    const amountNum = parseFloat(tonAmount);
    if (isNaN(amountNum) || amountNum < 0.01) {
      return res.status(400).json({ error: 'Minimum withdrawal amount is 0.01 TON' });
    }

    // 1. Fetch comprehensive withdrawal limits & gate progress
    const limits = await getUserWithdrawalLimits(userId);

    // 2. Check Daily Withdrawal Gate (8 Adsgram & 4 Monetag)
    if (!limits.gate.isUnlocked) {
      return res.status(403).json({
        error: 'Daily withdrawal gate requirements not met!',
        details: {
          adsgramProgress: `${limits.gate.adsgramWatched}/${limits.gate.adsgramRequired}`,
          monetagProgress: `${limits.gate.monetagWatched}/${limits.gate.monetagRequired}`,
          message: 'You must watch at least 8 Adsgram ads and 4 Monetag ads today to unlock the daily withdrawal gate.',
        },
      });
    }

    // 3. Check Daily Withdrawal Limit (Max 1 time per day)
    if (limits.daily.used >= limits.daily.limit) {
      return res.status(403).json({
        error: 'Daily withdrawal limit reached!',
        details: {
          limit: limits.daily.limit,
          usedToday: limits.daily.used,
          message: 'You have reached your daily limit of 1 withdrawal per day. Refreshes daily at 00:00 UTC.',
        },
      });
    }

    // 4. Check Daily Limit Unlock (Requires 30 ads watched today, refreshes daily)
    if (!limits.daily.isUnlocked) {
      return res.status(403).json({
        error: 'Daily withdrawal limit locked!',
        details: {
          adsWatched: limits.daily.adsWatched,
          adsRequired: limits.daily.adsRequired,
          remainingAds: limits.daily.adsRequired - limits.daily.adsWatched,
          message: `You must watch 30 ads today to unlock your daily withdrawal (${limits.daily.adsWatched}/30 watched today). These ads do not count towards the daily gate.`,
        },
      });
    }

    // 5. Check Weekly Withdrawal Limit (Max 5 times per week)
    if (limits.weekly.used >= limits.weekly.limit) {
      return res.status(403).json({
        error: 'Weekly withdrawal limit reached!',
        details: {
          limit: limits.weekly.limit,
          usedThisWeek: limits.weekly.used,
          message: 'You have reached your weekly limit of 5 withdrawals this week. Resets every Monday at 00:00 UTC.',
        },
      });
    }

    // 6. Check Weekly Limit Unlock (Requires 100 ads watched this week)
    if (!limits.weekly.isUnlocked) {
      return res.status(403).json({
        error: 'Weekly withdrawal limit locked!',
        details: {
          adsWatched: limits.weekly.adsWatched,
          adsRequired: limits.weekly.adsRequired,
          remainingAds: limits.weekly.adsRequired - limits.weekly.adsWatched,
          message: `You must watch 100 ads this week to unlock weekly withdrawals (${limits.weekly.adsWatched}/100 watched this week). These ads do not count towards the daily gate.`,
        },
      });
    }

    const amountDecimal = new Decimal(amountNum.toFixed(4));

    // Check user balance
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.ton_balance.lessThan(amountDecimal)) {
      return res.status(400).json({
        error: `Insufficient TON balance. Available: ${user.ton_balance.toFixed(4)} TON, Requested: ${amountDecimal.toFixed(4)} TON`,
      });
    }

    // Level restriction: Must be Level 2+ to withdraw more than 0.5 TON
    const userLevel = user.miner_level || 1;
    if (userLevel < 2 && amountNum > 0.5) {
      return res.status(403).json({
        error: 'Level 2 required to withdraw more than 0.5 TON.',
        details: {
          currentLevel: userLevel,
          requiredLevel: 2,
          maxWithdrawForLevel: 0.5,
          requestedAmount: amountNum,
          message: 'Level 1 miners can withdraw up to 0.50 TON. Upgrade your rig to Level 2 by watching 50 ads in one day to unlock payouts above 0.5 TON!',
        },
      });
    }

    // Freezes funds immediately and records pending withdrawal
    const withdrawal = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          ton_balance: { decrement: amountDecimal },
        },
      });

      return tx.withdrawal.create({
        data: {
          user_id: userId,
          ton_address: tonAddress.trim(),
          ton_amount: amountDecimal,
          status: 'PENDING',
        },
      });
    });

    // Send interactive approval card to Admin Telegram Channel
    const channelMessageId = await sendWithdrawalApprovalCard(
      withdrawal.id,
      user.id,
      user.username,
      user.first_name,
      withdrawal.ton_address,
      withdrawal.ton_amount.toFixed(4)
    );

    if (channelMessageId) {
      await prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: { channel_message_id: channelMessageId },
      });
    }

    // Optional asynchronous sync to Notion Withdrawals database
    syncWithdrawalToNotion({
      id: withdrawal.id,
      userId: user.id,
      tonAddress: withdrawal.ton_address,
      tonAmount: withdrawal.ton_amount.toFixed(4),
      status: withdrawal.status,
      createdAt: withdrawal.created_at,
    }).catch((err) => console.warn('[Notion] Sync withdrawal notice:', err.message));

    // Get fresh user balance and updated limits
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
    });
    const updatedLimits = await getUserWithdrawalLimits(userId);

    return res.json({
      success: true,
      message: 'Withdrawal request submitted for admin approval',
      withdrawal: {
        id: withdrawal.id,
        tonAddress: withdrawal.ton_address,
        tonAmount: withdrawal.ton_amount.toFixed(4),
        status: withdrawal.status,
        createdAt: withdrawal.created_at,
      },
      remainingBalance: updatedUser?.ton_balance.toFixed(6),
      limits: updatedLimits,
    });
  } catch (err) {
    console.error('Error requesting withdrawal:', err);
    return res.status(500).json({ error: 'Failed to process withdrawal request', message: (err as Error).message });
  }
}

export async function getWithdrawalHistory(req: Request, res: Response) {
  try {
    const userId = req.telegramUser!.id;
    const history = await prisma.withdrawal.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 20,
    });

    return res.json({
      history: history.map((w) => ({
        id: w.id,
        tonAddress: w.ton_address,
        tonAmount: w.ton_amount.toFixed(4),
        status: w.status,
        createdAt: w.created_at,
      })),
    });
  } catch (err) {
    console.error('Error fetching withdrawal history:', err);
    return res.status(500).json({ error: 'Failed to fetch withdrawal history', message: (err as Error).message });
  }
}

