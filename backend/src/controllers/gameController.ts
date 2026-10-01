import { Request, Response } from 'express';
import { GameService } from '../services/gameService.js';

export async function startGame(req: Request, res: Response) {
  try {
    const rawId = req.telegramUser?.id || req.body?.userId;
    if (!rawId) {
      return res.status(401).json({ error: 'Unauthorized: User ID required' });
    }
    const userId = BigInt(rawId);
    const { gameType } = req.body;

    if (!gameType || typeof gameType !== 'string') {
      return res.status(400).json({
        error: "Missing or invalid 'gameType'. Must be 'game_memory', 'game_2048', 'game_carrace', or 'game_tubesort'.",
      });
    }

    const session = await GameService.startSession(userId, gameType);
    return res.json({
      success: true,
      sessionId: session.sessionId,
    });
  } catch (err) {
    console.error('Error starting game:', err);
    return res.status(400).json({ error: 'Failed to start game session', message: (err as Error).message });
  }
}

export async function finishGame(req: Request, res: Response) {
  try {
    const rawId = req.telegramUser?.id || req.body?.userId;
    if (!rawId) {
      return res.status(401).json({ error: 'Unauthorized: User ID required' });
    }
    const userId = BigInt(rawId);
    const { sessionId, score, movesCount } = req.body;
    const finalScore = typeof score === 'number' ? score : (typeof movesCount === 'number' ? movesCount : 0);

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing required field: sessionId' });
    }

    const result = await GameService.finishSession(userId, sessionId, Math.floor(finalScore), movesCount);
    return res.json(result);
  } catch (err) {
    console.warn('Game finish rejected:', (err as Error).message);
    const msg = (err as Error).message || '';
    const status = msg.includes('Anti-cheat') || msg.includes('too quickly') || msg.includes('Insufficient moves') ? 403 : 400;
    return res.status(status).json({ error: 'Game round validation failed', message: msg });
  }
}
