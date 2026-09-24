import { Request, Response } from 'express';
import { MissionService } from '../services/missionService.js';

export async function getAvailableMissions(req: Request, res: Response) {
  try {
    const userId = req.telegramUser!.id;
    const missions = await MissionService.getAvailableMissions(userId);
    return res.json({ missions });
  } catch (err) {
    console.error('Error fetching missions:', err);
    return res.status(500).json({ error: 'Failed to fetch missions', message: (err as Error).message });
  }
}

export async function startMission(req: Request, res: Response) {
  try {
    const userId = req.telegramUser!.id;
    const { missionId } = req.body;

    if (!missionId) {
      return res.status(400).json({ error: 'Missing missionId' });
    }

    const result = await MissionService.startMission(userId, Number(missionId));
    return res.json(result);
  } catch (err) {
    console.error('Error starting mission:', err);
    return res.status(400).json({ error: 'Failed to start mission', message: (err as Error).message });
  }
}

export async function claimMission(req: Request, res: Response) {
  try {
    const userId = req.telegramUser!.id;
    const { missionId } = req.body;

    if (!missionId) {
      return res.status(400).json({ error: 'Missing missionId' });
    }

    const result = await MissionService.claimMission(userId, Number(missionId));
    return res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.warn('Mission claim error:', (err as Error).message);
    return res.status(400).json({ error: 'Mission claim failed', message: (err as Error).message });
  }
}

export async function createMission(req: Request, res: Response) {
  try {
    const userId = req.telegramUser!.id;
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
      requiresProof,
      proofInstructions,
    } = req.body;

    if (!title || !description || !actionUrl || !ncReward) {
      return res.status(400).json({ error: 'Missing required mission fields' });
    }

    const isScreenshot = taskType === 'screenshot_social' || Boolean(requiresProof);

    const newMission = await MissionService.createMission({
      creatorUserId: userId,
      title,
      description,
      category: category || (isScreenshot ? 'social' : 'partner'),
      taskType: taskType || (isScreenshot ? 'screenshot_social' : 'visit_url'),
      actionUrl,
      telegramChatId: telegramChatId || null,
      ncReward: Number(ncReward),
      tonReward: tonReward ? Number(tonReward) : 0,
      targetUsers: targetUsers ? Number(targetUsers) : null,
      priority: 1,
      requiresProof: isScreenshot,
      proofInstructions: proofInstructions || (isScreenshot ? 'Upload a screenshot showing you followed/subscribed' : null),
    });

    return res.json({
      success: true,
      mission: newMission,
    });
  } catch (err) {
    console.error('Error creating mission:', err);
    return res.status(500).json({ error: 'Failed to create mission', message: (err as Error).message });
  }
}
