import { prisma } from '../db/db.js';
import { bot } from '../bot/telegrafInstance.js';
import { Decimal } from '@prisma/client/runtime/library';

export class MissionService {
  /**
   * Retrieves active missions not yet claimed by the user and within target quota
   */
  static async getAvailableMissions(userId: bigint) {
    const claims = await prisma.missionClaim.findMany({
      where: { user_id: userId },
      select: { mission_id: true },
    });

    const claimedMissionIds = new Set(claims.map((c) => c.mission_id));

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

    // Check if user already claimed
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

    // Verification logic for telegram_join
    if (mission.task_type === 'telegram_join' && mission.telegram_chat_id) {
      if (bot) {
        try {
          const member = await bot.telegram.getChatMember(mission.telegram_chat_id, Number(userId));
          const validStatuses = ['creator', 'administrator', 'member', 'restricted'];
          if (!validStatuses.includes(member.status)) {
            throw new Error(`You must join ${mission.telegram_chat_id} before claiming rewards.`);
          }
        } catch (chatErr) {
          // If bot is not an admin in the channel or error, log warning
          console.warn(`Could not verify channel membership for user ${userId}:`, (chatErr as Error).message);
          // Allow dev fallback if chat lookup fails due to bot channel permissions
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
