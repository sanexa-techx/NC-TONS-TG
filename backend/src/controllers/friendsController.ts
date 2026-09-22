import { Request, Response } from 'express';
import { prisma } from '../db/db.js';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * GET /api/friends/stats
 * Returns summary referral statistics and the list of up to 50 referred friends
 */
export async function getFriendStats(req: Request, res: Response) {
  try {
    const rawUserId = req.query.userId || req.telegramUser?.id;
    if (!rawUserId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const userId = BigInt(String(rawUserId).replace(/[^0-9]/g, ''));

    // Fetch user referral counters
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        referral_count: true,
        unclaimed_referral_nc: true,
        unclaimed_referral_ton: true,
        total_referral_nc: true,
        total_referral_ton: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch last 50 invited friends
    const referrals = await prisma.referral.findMany({
      where: { referrer_id: userId },
      orderBy: { created_at: 'desc' },
      take: 50,
      include: {
        referee: {
          select: {
            first_name: true,
            username: true,
          },
        },
      },
    });

    const friends = referrals.map((r: any) => ({
      bonus_nc: r.bonus_nc,
      bonus_ton: r.bonus_ton ? r.bonus_ton.toString() : '0.000000',
      is_premium: Boolean(r.is_premium),
      created_at: r.created_at,
      first_name: r.referee?.first_name || 'Friend',
      username: r.referee?.username || null,
    }));

    return res.json({
      stats: {
        referral_count: user.referral_count || 0,
        unclaimed_referral_nc: user.unclaimed_referral_nc ? user.unclaimed_referral_nc.toString() : '0',
        unclaimed_referral_ton: user.unclaimed_referral_ton ? user.unclaimed_referral_ton.toString() : '0.000000',
        total_referral_nc: user.total_referral_nc ? user.total_referral_nc.toString() : '0',
        total_referral_ton: user.total_referral_ton ? user.total_referral_ton.toString() : '0.000000',
      },
      friends,
      botUsername: (process.env.BOT_USERNAME || 'NCTONs_bot').replace('@', ''),
    });
  } catch (err: any) {
    console.error('Error fetching referral stats:', err);
    return res.status(500).json({ error: 'Database error', message: err.message });
  }
}

/**
 * POST /api/friends/claim
 * Atomically transfers accumulated referral rewards into main nc_balance and ton_balance
 */
export async function claimFriendRewards(req: Request, res: Response) {
  try {
    const rawUserId = req.body?.userId || req.telegramUser?.id;
    if (!rawUserId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const userId = BigInt(String(rawUserId).replace(/[^0-9]/g, ''));

    const result = await prisma.$transaction(async (tx: any) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      const claimNc = BigInt(user.unclaimed_referral_nc || 0);
      const claimTon = user.unclaimed_referral_ton instanceof Decimal
        ? user.unclaimed_referral_ton
        : new Decimal(user.unclaimed_referral_ton || 0);

      if (claimNc <= 0n && claimTon.lessThanOrEqualTo(0)) {
        throw new Error('NO_PENDING_REWARDS');
      }

      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          nc_balance: { increment: claimNc },
          ton_balance: { increment: claimTon },
          unclaimed_referral_nc: 0n,
          unclaimed_referral_ton: new Decimal('0.000000'),
        },
      });

      return {
        claimed: {
          nc: Number(claimNc),
          ton: parseFloat(claimTon.toString()),
        },
        newBalances: {
          nc_balance: updated.nc_balance.toString(),
          ton_balance: updated.ton_balance.toString(),
        },
      };
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    if (err.message === 'NO_PENDING_REWARDS') {
      return res.status(400).json({ error: 'No pending rewards to claim' });
    }
    if (err.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'User not found' });
    }
    console.error('Error claiming referral rewards:', err);
    return res.status(500).json({ error: 'Claim failed', message: err.message });
  }
}

/**
 * POST /api/friends/simulate-referral
 * Dev helper to test referral invites in both local and preview environments
 */
export async function simulateReferral(req: Request, res: Response) {
  try {
    const rawReferrerId = req.body?.referrerId || req.telegramUser?.id || '9990001';
    const referrerId = BigInt(String(rawReferrerId).replace(/[^0-9]/g, ''));
    const isPremium = Boolean(req.body?.isPremium);
    const customName = req.body?.firstName || (isPremium ? 'Telegram VIP' : 'Cyber Friend');
    const customUsername = req.body?.username || (isPremium ? 'tg_vip' : 'friend_miner');

    const bonusNc = isPremium ? 2500 : 1000;
    const bonusTon = isPremium ? 0.000200 : 0.000080;
    const starterNc = isPremium ? 2000 : 1000;

    // Generate simulated referee ID
    const refereeId = BigInt(Date.now().toString().slice(-9) + Math.floor(Math.random() * 10));

    // Ensure referrer exists
    const referrer = await prisma.user.findUnique({ where: { id: referrerId } });
    if (!referrer) {
      return res.status(404).json({ error: 'Referrer not found' });
    }

    // Create referee user
    await prisma.user.create({
      data: {
        id: refereeId,
        first_name: customName,
        username: customUsername,
        referred_by: referrerId,
        ton_balance: 0,
        nc_balance: BigInt(starterNc),
        power_percentage: 100,
        power_capacity_hours: 8,
        ton_hashrate_per_sec: 0.00000100,
      },
    });

    // Create referral log
    const ref = await prisma.referral.create({
      data: {
        referrer_id: referrerId,
        referee_id: refereeId,
        is_premium: isPremium,
        bonus_nc: bonusNc,
        bonus_ton: bonusTon,
      },
    });

    // Update referrer's claimable stash
    const updatedReferrer = await prisma.user.update({
      where: { id: referrerId },
      data: {
        referral_count: { increment: 1 },
        unclaimed_referral_nc: { increment: BigInt(bonusNc) },
        unclaimed_referral_ton: { increment: bonusTon },
        total_referral_nc: { increment: BigInt(bonusNc) },
        total_referral_ton: { increment: bonusTon },
      },
    });

    return res.json({
      success: true,
      message: `Simulated referral added for ${customName} (${isPremium ? 'TG Premium' : 'Standard'})`,
      referral: ref,
      referrerStats: {
        referral_count: updatedReferrer.referral_count,
        unclaimed_referral_nc: updatedReferrer.unclaimed_referral_nc.toString(),
        unclaimed_referral_ton: updatedReferrer.unclaimed_referral_ton.toString(),
      },
    });
  } catch (err: any) {
    console.error('Error simulating referral:', err);
    return res.status(500).json({ error: 'Simulation failed', message: err.message });
  }
}
