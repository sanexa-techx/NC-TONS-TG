import { Request, Response } from 'express';
import { GameService } from '../services/gameService.js';

export async function startGame(req: Request, res: Response) {
  try {
    const userId = req.telegramUser!.id;
    const session = GameService.startSession(userId);
    return res.json(session);
  } catch (err) {
    console.error('Error starting game:', err);
    return res.status(500).json({ error: 'Failed to start game session', message: (err as Error).message });
  }
}

export async function finishGame(req: Request, res: Response) {
  try {
    const userId = req.telegramUser!.id;
    const { sessionId, score } = req.body;

    if (!sessionId || typeof score !== 'number') {
      return res.status(400).json({ error: 'Missing required fields: sessionId and numeric score' });
    }

    const result = await GameService.finishSession(userId, sessionId, Math.floor(score));
    return res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.warn('Game finish rejected:', (err as Error).message);
    return res.status(400).json({ error: 'Game round validation failed', message: (err as Error).message });
  }
}
