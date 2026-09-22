import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ENV } from '../config/env.js';

export interface TelegramUserData {
  id: bigint;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      telegramUser?: TelegramUserData;
    }
  }
}

/**
 * Validates Telegram WebApp initData string using HMAC-SHA256
 */
export function verifyTelegramInitData(initData: string, botToken: string): TelegramUserData | null {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    if (!hash) return null;

    urlParams.delete('hash');

    // Sort parameters alphabetically
    const params: string[] = [];
    urlParams.forEach((value, key) => {
      params.push(`${key}=${value}`);
    });
    params.sort();

    const dataCheckString = params.join('\n');

    // Telegram HMAC calculation:
    // secret_key = HMAC_SHA256("WebAppData", botToken)
    // calculated_hash = HMAC_SHA256(dataCheckString, secret_key)
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (calculatedHash !== hash) {
      return null;
    }

    const userStr = urlParams.get('user');
    if (!userStr) return null;

    const parsedUser = JSON.parse(userStr);
    return {
      id: BigInt(parsedUser.id),
      first_name: parsedUser.first_name || 'Miner',
      last_name: parsedUser.last_name,
      username: parsedUser.username,
      language_code: parsedUser.language_code,
      is_premium: parsedUser.is_premium,
    };
  } catch (err) {
    console.error('Error verifying Telegram initData:', err);
    return null;
  }
}

/**
 * Express Middleware for authenticating requests via Telegram WebApp initData
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const devTelegramId = req.headers['x-dev-telegram-id'];

  // 1. Check for standard Telegram initData in Authorization header or body
  let initData = '';
  if (authHeader && authHeader.startsWith('tma ')) {
    initData = authHeader.substring(4);
  } else if (req.body && req.body.initData) {
    initData = req.body.initData;
  }

  if (initData && ENV.BOT_TOKEN) {
    const user = verifyTelegramInitData(initData, ENV.BOT_TOKEN);
    if (user) {
      req.telegramUser = user;
      return next();
    }
  }

  // 2. Dev mode fallback if allowed
  if (ENV.ALLOW_DEV_AUTH) {
    const rawDevId = devTelegramId || req.body?.devUserId || '9990001';
    const devId = BigInt(String(rawDevId).replace(/[^0-9]/g, '') || '9990001');
    const devUsername = (req.headers['x-dev-username'] as string) || req.body?.devUsername || 'DevMiner';

    req.telegramUser = {
      id: devId,
      first_name: devUsername,
      username: devUsername.toLowerCase(),
    };
    return next();
  }

  return res.status(401).json({
    error: 'Unauthorized',
    message: 'Valid Telegram WebApp initData is required',
  });
}
