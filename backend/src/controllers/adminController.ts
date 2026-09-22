import { Request, Response } from 'express';
import { prisma } from '../db/db.js';
import { Decimal } from '@prisma/client/runtime/library';

export async function getRewardConfigs(req: Request, res: Response) {
  try {
    const rawConfigs = await prisma.rewardConfig.findMany({
      orderBy: { action_type: 'asc' },
    });
    const configs = rawConfigs.map((c: any) => ({
      actionType: c.action_type || c.actionType,
      displayName: c.display_name || c.displayName || c.action_type || c.actionType,
      ncReward: Number(c.nc_reward !== undefined ? c.nc_reward : c.ncReward),
      tonReward: c.ton_reward !== undefined
        ? (typeof c.ton_reward === 'object' && c.ton_reward.toFixed ? c.ton_reward.toFixed(6) : c.ton_reward.toString())
        : (c.tonReward?.toString() || '0.000000'),
      updatedAt: c.updated_at || c.updatedAt,
      // Provide snake_case for backward compatibility
      action_type: c.action_type || c.actionType,
      display_name: c.display_name || c.displayName || c.action_type || c.actionType,
      nc_reward: Number(c.nc_reward !== undefined ? c.nc_reward : c.ncReward),
      ton_reward: c.ton_reward !== undefined ? c.ton_reward : c.tonReward,
    }));
    return res.json({ configs });
  } catch (err) {
    console.error('Error fetching reward configs:', err);
    return res.status(500).json({ error: 'Failed to fetch reward configs', message: (err as Error).message });
  }
}

export async function updateRewardConfig(req: Request, res: Response) {
  try {
    const actionType = req.body.actionType || req.body.action_type;
    const ncReward = req.body.ncReward !== undefined ? req.body.ncReward : req.body.nc_reward;
    const tonReward = req.body.tonReward !== undefined ? req.body.tonReward : req.body.ton_reward;
    const displayName = req.body.displayName || req.body.display_name;

    if (!actionType || ncReward === undefined || tonReward === undefined || isNaN(Number(ncReward)) || isNaN(Number(tonReward))) {
      return res.status(400).json({ error: 'Missing required fields: actionType, ncReward, tonReward' });
    }

    const updated = await prisma.rewardConfig.upsert({
      where: { action_type: actionType },
      update: {
        nc_reward: Number(ncReward),
        ton_reward: new Decimal(Number(tonReward).toFixed(6)),
        display_name: displayName || undefined,
        updated_at: new Date(),
      },
      create: {
        action_type: actionType,
        display_name: displayName || actionType,
        nc_reward: Number(ncReward),
        ton_reward: new Decimal(Number(tonReward).toFixed(6)),
        updated_at: new Date(),
      },
    });

    return res.json({
      success: true,
      config: {
        actionType: updated.action_type,
        displayName: updated.display_name,
        ncReward: updated.nc_reward,
        tonReward: updated.ton_reward.toFixed(6),
        updatedAt: updated.updated_at,
      },
    });
  } catch (err) {
    console.error('Error updating reward config:', err);
    return res.status(500).json({ error: 'Failed to update reward config', message: (err as Error).message });
  }
}

export async function createAdminMission(req: Request, res: Response) {
  try {
    const adminId = req.telegramUser!.id;
    const {
      title,
      description,
      category,
      taskType,
      actionUrl,
      telegramChatId,
      ncReward,
      tonReward,
      targetUsers,
      priority,
    } = req.body;

    if (!title || !description || !actionUrl) {
      return res.status(400).json({ error: 'Missing required mission fields' });
    }

    const mission = await prisma.dynamicMission.create({
      data: {
        creator_user_id: adminId,
        title,
        description,
        category: category || 'telegram',
        task_type: taskType || 'telegram_join',
        action_url: actionUrl,
        telegram_chat_id: telegramChatId || null,
        nc_reward: Number(ncReward || 500),
        ton_reward: new Decimal(Number(tonReward || 0.0005).toFixed(6)),
        target_users: targetUsers ? Number(targetUsers) : null,
        priority: priority !== undefined ? Number(priority) : 10,
        is_active: true,
      },
    });

    return res.json({ success: true, mission });
  } catch (err) {
    console.error('Error creating admin mission:', err);
    return res.status(500).json({ error: 'Failed to create mission', message: (err as Error).message });
  }
}

export async function updateAdminMission(req: Request, res: Response) {
  try {
    const missionId = parseInt(req.params.id, 10);
    const { isActive, priority, ncReward, tonReward, targetUsers } = req.body;

    const data: any = {};
    if (typeof isActive === 'boolean') data.is_active = isActive;
    if (priority !== undefined) data.priority = Number(priority);
    if (ncReward !== undefined) data.nc_reward = Number(ncReward);
    if (tonReward !== undefined) data.ton_reward = new Decimal(Number(tonReward).toFixed(6));
    if (targetUsers !== undefined) data.target_users = targetUsers ? Number(targetUsers) : null;

    const updated = await prisma.dynamicMission.update({
      where: { id: missionId },
      data,
    });

    return res.json({ success: true, mission: updated });
  } catch (err) {
    console.error('Error updating mission:', err);
    return res.status(500).json({ error: 'Failed to update mission', message: (err as Error).message });
  }
}

export async function getAdminStats(req: Request, res: Response) {
  try {
    const [totalUsers, activeMissionsCount, pendingWithdrawalsCount] = await Promise.all([
      prisma.user.count(),
      prisma.dynamicMission.count({ where: { is_active: true } }),
      prisma.withdrawal.count({ where: { status: 'PENDING' } }),
    ]);

    return res.json({
      totalUsers,
      activeMissionsCount,
      pendingWithdrawalsCount,
    });
  } catch (err) {
    console.error('Error fetching admin stats:', err);
    return res.status(500).json({ error: 'Failed to fetch stats', message: (err as Error).message });
  }
}
