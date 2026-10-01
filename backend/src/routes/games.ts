import { Router } from 'express';
import { startGame, finishGame } from '../controllers/gameController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// 1. Start Color Tube / Arcade Game Session
router.post('/start', authMiddleware, startGame);

// 2. Finish Game & Credit Rewards with Anti-Cheat Verification
router.post('/finish', authMiddleware, finishGame);

export default router;
