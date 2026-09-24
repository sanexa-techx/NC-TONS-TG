import { prisma, pool } from '../db/db.js';
import { bot } from '../bot/telegrafInstance.js';
import { Decimal } from '@prisma/client/runtime/library';

export class MissionService {
  /**
   * Records that a user has opened and started engaging with a mission
   */
  static async startMission(userId: bigint, missionId: number) {
    const mission = await prisma.dynamicMission.findUnique({
      where: { id: missionId },
    });

    if (!mission) {
      throw new Error('Mission not found');
    }

    if (!mission.is_active) {
      throw new Error('Mission is no longer active');
    }

    if (pool) {
      await pool.query(
        `INSERT INTO mission_visits (user_id, mission_id, started_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id, mission_id)
         DO UPDATE SET started_at = NOW()`,
        [userId.toString(), missionId]
      );
    }

    return {
      success: true,
      missionId,
      startedAt: new Date().toISOString(),
      requiredEngagementSeconds: 15,
    };
  }

  /**
   * Retrieves active missions not yet claimed by the user and within target quota
   */
  static async getAvailableMissions(userId: bigint) {
    const claims = await prisma.missionClaim.findMany({
      where: { user_id: userId },
      select: { mission_id: true },
    });

    const claimedMissionIds = new Set(claims.map((c) => c.mission_id));

    // Also check user_mission_claims table if present
    if (pool) {
      try {
        const altClaims = await pool.query(
          'SELECT mission_id FROM user_mission_claims WHERE user_id = $1',
          [userId.toString()]
        );
        for (const row of altClaims.rows) {
          claimedMissionIds.add(Number(row.mission_id));
        }
      } catch (e) {}
    }

    // Fetch user proof submissions
    const proofStatusMap = new Map<number, string>();
    try {
      if ((prisma as any).taskProofSubmission) {
        const proofs = await (prisma as any).taskProofSubmission.findMany({
          where: { user_id: userId },
        });
        for (const p of proofs) {
          proofStatusMap.set(p.mission_id, p.status);
        }
      } else if (pool) {
        const proofs = await pool.query(
          'SELECT mission_id, status FROM task_proof_submissions WHERE user_id = $1',
          [userId.toString()]
        );
        for (const p of proofs.rows) {
          proofStatusMap.set(Number(p.mission_id), p.status);
        }
      }
    } catch (e) {
      // In case table or model is not yet accessible
    }

    const missions = await prisma.dynamicMission.findMany({
      where: {
        is_active: true,
      },
      orderBy: [{ priority: 'desc' }, { created_at: 'desc' }],
    });

    return missions.map((m: any) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      category: m.category,
      taskType: m.task_type,
      actionUrl: m.action_url,
      telegramChatId: m.telegram_chat_id,
      ncReward: m.nc_reward,
      tonReward: m.ton_reward.toFixed(6),
      targetUsers: m.target_users,
      completedCount: m.completed_count,
      isCompleted: claimedMissionIds.has(m.id),
      isSoldOut: m.target_users !== null && m.completed_count >= m.target_users,
      requiresProof: Boolean(m.requires_proof || m.task_type === 'screenshot_social'),
      proofInstructions: m.proof_instructions || 'Upload a screenshot showing you followed/subscribed',
      proofStatus: proofStatusMap.get(m.id) || null,
    }));
  }

  /**
   * Verifies task completion and atomically credits rewards
   */
  static async claimMission(userId: bigint, missionId: number) {
    const mission = await prisma.dynamicMission.findUnique({
      where: { id: missionId },
    });

    if (!mission) {
      throw new Error('Mission not found');
    }

    if (!mission.is_active) {
      throw new Error('Mission is no longer active');
    }

    if (mission.target_users !== null && mission.completed_count >= mission.target_users) {
      throw new Error('Mission reward budget has been exhausted');
    }

    // 1. Check if user already claimed
    const existingClaim = await prisma.missionClaim.findUnique({
      where: {
        user_id_mission_id: {
          user_id: userId,
          mission_id: missionId,
        },
      },
    });

    if (existingClaim) {
      throw new Error('Mission already claimed by user');
    }

    if (pool) {
      const altCheck = await pool.query(
        'SELECT id FROM user_mission_claims WHERE user_id = $1 AND mission_id = $2',
        [userId.toString(), missionId]
      );
      if (altCheck.rows.length > 0) {
        throw new Error('Mission already claimed by user');
      }
    }

    // 2. STRICT CHECK: Screenshot proof missions CANNOT be claimed directly via API
    if (mission.requires_proof || mission.task_type === 'screenshot_social') {
      throw new Error(
        'This mission requires screenshot proof. Please upload and submit your screenshot proof for review.'
      );
    }

    // 3. STRICT CHECK: Telegram Channel/Group Join Verification
    let targetChatId = mission.telegram_chat_id;
    if (!targetChatId && mission.action_url) {
      const match = mission.action_url.match(/(?:t\.me\/|telegram\.me\/)([\w_]+)/i);
      if (match && match[1] && !match[1].toLowerCase().includes('bot')) {
        targetChatId = `@${match[1]}`;
      }
    }

    if (mission.task_type === 'telegram_join' || targetChatId) {
      const chatToCheck = targetChatId || mission.telegram_chat_id;
      if (!chatToCheck) {
        throw new Error('Invalid Telegram channel configuration for this mission.');
      }

      if (!bot) {
        throw new Error(
          'Telegram verification service is unavailable. Please make sure the bot is running or try again later.'
        );
      }

      try {
        const member = await bot.telegram.getChatMember(chatToCheck, Number(userId));
        const validStatuses = ['creator', 'administrator', 'member', 'restricted'];
        if (!member || !validStatuses.includes(member.status)) {
          throw new Error(`You have not joined ${chatToCheck}. Please join the channel first to claim your reward.`);
        }
      } catch (err: any) {
        const msg = (err.message || '').toLowerCase();
        if (
          msg.includes('user not found') ||
          msg.includes('participant_id_invalid') ||
          msg.includes('have not joined') ||
          msg.includes('member not found')
        ) {
          throw new Error(`You have not joined ${chatToCheck}. Please join the channel first to claim your reward.`);
        }

        if (
          msg.includes('chat not found') ||
          msg.includes('bot is not a member') ||
          msg.includes('forbidden') ||
          msg.includes('not enough rights')
        ) {
          throw new Error(
            `Cannot verify membership automatically because the bot is not an admin in ${chatToCheck}. Please contact admin or submit screenshot proof.`
          );
        }

        // Any other explicit failure from Telegram
        throw new Error(`Channel verification failed for ${chatToCheck}: ${err.message}`);
      }
    }

    // 4. STRICT CHECK: Engagement / Link Visit Timing for external URLs & bot launches
    if (mission.task_type === 'visit_url' || mission.task_type === 'bot_launch') {
      if (pool) {
        const visitRes = await pool.query(
          `SELECT started_at, EXTRACT(EPOCH FROM (NOW() - started_at)) as elapsed_sec 
           FROM mission_visits 
           WHERE user_id = $1 AND mission_id = $2`,
          [userId.toString(), missionId]
        );

        if (visitRes.rows.length === 0) {
          throw new Error('You must open and engage with the mission link before claiming.');
        }

        const elapsedSec = parseFloat(visitRes.rows[0].elapsed_sec);
        const REQUIRED_ENGAGEMENT_SEC = 15;
        if (isNaN(elapsedSec) || elapsedSec < REQUIRED_ENGAGEMENT_SEC) {
          const remaining = Math.ceil(REQUIRED_ENGAGEMENT_SEC - (elapsedSec || 0));
          throw new Error(
            `Engagement check in progress. Please review the link for at least ${remaining} more second${remaining === 1 ? '' : 's'} before claiming.`
          );
        }
      }
    }

    // Atomic execution: create claim, increment mission count, credit user rewards
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create claim
      const claim = await tx.missionClaim.create({
        data: {
          mission_id: missionId,
          user_id: userId,
        },
      });

      if (pool) {
        try {
          await pool.query(
            'INSERT INTO user_mission_claims (user_id, mission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [userId.toString(), missionId]
          );
        } catch (e) {}
      }

      // 2. Increment completed count atomically
      const updatedMission = await tx.dynamicMission.update({
        where: { id: missionId },
        data: {
          completed_count: { increment: 1 },
        },
      });

      // 3. Credit user NC and TON balances
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          nc_balance: { increment: BigInt(mission.nc_reward) },
          ton_balance: { increment: mission.ton_reward },
        },
      });

      return {
        claimId: claim.id,
        ncAwarded: mission.nc_reward,
        tonAwarded: mission.ton_reward.toFixed(6),
        newNcBalance: updatedUser.nc_balance.toString(),
        newTonBalance: updatedUser.ton_balance.toFixed(6),
      };
    });

    return result;
  }

  /**
   * Creates a dynamic sponsored mission (Community P2P or Admin)
   */
  static async createMission(data: {
    creatorUserId: bigint;
    title: string;
    description: string;
    category: string;
    taskType: string;
    actionUrl: string;
    telegramChatId?: string | null;
    ncReward: number;
    tonReward: number | string;
    targetUsers?: number | null;
    priority?: number;
    requiresProof?: boolean;
    proofInstructions?: string | null;
  }) {
    const isScreenshot = data.taskType === 'screenshot_social' || Boolean(data.requiresProof);
    return prisma.dynamicMission.create({
      data: {
        creator_user_id: data.creatorUserId,
        title: data.title,
        description: data.description,
        category: data.category,
        task_type: data.taskType,
        action_url: data.actionUrl,
        telegram_chat_id: data.telegramChatId || null,
        nc_reward: data.ncReward,
        ton_reward: new Decimal(data.tonReward.toString()),
        target_users: data.targetUsers || null,
        priority: data.priority ?? 0,
        is_active: true,
        requires_proof: isScreenshot,
        proof_instructions: data.proofInstructions || (isScreenshot ? 'Upload a screenshot showing you followed/subscribed' : null),
      },
    });
  }
}
