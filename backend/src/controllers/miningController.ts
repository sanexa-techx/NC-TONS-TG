import { Request, Response } from 'express';
import { MiningService } from '../services/miningService.js';

export async function syncMining(req: Request, res: Response) {
  try {
    const userId = req.telegramUser!.id;
    const miningState = await MiningService.syncMining(userId);
    return res.json(miningState);
  } catch (err) {
    console.error('Error in mining sync:', err);
    return res.status(500).json({ error: 'Mining sync failed', message: (err as Error).message });
  }
}

export async function rechargeMining(req: Request, res: Response) {
  try {
    const userId = req.telegramUser!.id;
    const method = req.body.method === 'ad' ? 'ad' : 'nc';
    const updatedState = await MiningService.rechargePower(userId, method);
    return res.json({
      success: true,
      message: method === 'nc' ? 'Battery recharged with 500 NC Coins' : 'Battery recharged via Rewarded Ad',
      mining: updatedState,
    });
  } catch (err) {
    console.error('Error in mining recharge:', err);
    return res.status(400).json({ error: 'Recharge failed', message: (err as Error).message });
  }
}
