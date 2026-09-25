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
    const user: any = await (prisma.user as any).findUnique({
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

    // Fetch milestones, user milestone claims, and dynamic referral rates
    const [allMilestones, userClaims, stdCfg, premCfg] = await Promise.all([
      prisma.referralMilestone.findMany({ orderBy: { target_count: 'asc' } }),
      prisma.userMilestoneClaim.findMany({ where: { user_id: userId } }),
      prisma.rewardConfig.findUnique({ where: { action_type: 'referral_standard' } }),
      prisma.rewardConfig.findUnique({ where: { action_type: 'referral_premium' } }),
    ]);

    const claimedSet = new Set(userClaims.map((c: any) => c.target_count));
    const userReferralCount = user.referral_count || 0;

    const milestones = allMilestones.map((m: any) => {
      const isClaimed = claimedSet.has(m.target_count);
      const canClaim = !isClaimed && userReferralCount >= m.target_count;
      return {
        targetCount: m.target_count,
        displayName: m.display_name,
        ncReward: m.nc_reward,
        tonReward: m.ton_reward instanceof Decimal ? m.ton_reward.toFixed(6) : Number(m.ton_reward).toFixed(6),
        isClaimed,
        canClaim,
      };
    });

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
      milestones,
      rates: {
        standard: {
          nc: stdCfg?.nc_reward ?? 1000,
          ton: stdCfg?.ton_reward ? (stdCfg.ton_reward instanceof Decimal ? stdCfg.ton_reward.toFixed(6) : Number(stdCfg.ton_reward).toFixed(6)) : '0.000080',
        },
        premium: {
          nc: premCfg?.nc_reward ?? 2500,
          ton: premCfg?.ton_reward ? (premCfg.ton_reward instanceof Decimal ? premCfg.ton_reward.toFixed(6) : Number(premCfg.ton_reward).toFixed(6)) : '0.000200',
        },
      },
      botUsername: (process.env.BOT_USERNAME || 'NCTONs_bot').replace('@', ''),
    });
  } catch (err: any) {
    console.error('Error fetching referral stats:', err);
    return res.status(500).json({ error: 'Database error', message: err.message });
  }
}

/**
 * POST /api/friends/claim-milestone
 * Claim reward for reaching 1, 3, 7, 10 recruited friends
 */
export async function claimMilestoneReward(req: Request, res: Response) {
  try {
    const rawUserId = req.body?.userId || req.telegramUser?.id;
    const targetCount = parseInt(req.body?.targetCount, 10);
    if (!rawUserId || isNaN(targetCount)) {
      return res.status(400).json({ error: 'Missing userId or targetCount' });
    }
    const userId = BigInt(String(rawUserId).replace(/[^0-9]/g, ''));

    const user: any = await prisma.user.findUnique({
      where: { id: userId },
      select: { referral_count: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if ((user.referral_count || 0) < targetCount) {
      return res.status(400).json({
        error: `Requires at least ${targetCount} recruited friends to unlock this milestone.`,
      });
    }

    const milestone = await prisma.referralMilestone.findUnique({
      where: { target_count: targetCount },
    });
    if (!milestone) return res.status(404).json({ error: 'Milestone tier not found' });

    const existingClaim = await prisma.userMilestoneClaim.findUnique({
      where: { unique_user_milestone: { user_id: userId, target_count: targetCount } },
    });
    if (existingClaim) {
      return res.status(400).json({ error: 'Milestone already claimed' });
    }

    const ncReward = BigInt(milestone.nc_reward);
    const tonReward = milestone.ton_reward instanceof Decimal ? milestone.ton_reward : new Decimal(milestone.ton_reward);

    const result = await prisma.$transaction(async (tx: any) => {
      await tx.userMilestoneClaim.create({
        data: {
          user_id: userId,
          target_count: targetCount,
        },
      });

      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          nc_balance: { increment: ncReward },
          ton_balance: { increment: tonReward },
        },
      });

      return {
        nc_balance: updated.nc_balance.toString(),
        ton_balance: updated.ton_balance instanceof Decimal ? updated.ton_balance.toFixed(6) : Number(updated.ton_balance).toFixed(6),
      };
    });

    return res.json({
      success: true,
      claimed: {
        targetCount,
        ncReward: milestone.nc_reward,
        tonReward: tonReward.toFixed(6),
      },
      newBalances: result,
    });
  } catch (err: any) {
    console.error('Error claiming milestone reward:', err);
    return res.status(500).json({ error: 'Failed to claim milestone', message: err.message });
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


