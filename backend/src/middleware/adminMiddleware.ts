import { Request, Response, NextFunction } from 'express';
import { isAdmin } from '../config/env.js';

export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.telegramUser) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
  }

  const userId = req.telegramUser.id.toString();
  if (!isAdmin(userId)) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Admin privileges required',
    });
  }

  next();
}
