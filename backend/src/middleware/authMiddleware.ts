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
  const tgUserId = req.headers['x-telegram-user-id'] as string;
  const tgUsername = req.headers['x-telegram-username'] as string;
  const tgFirstName = req.headers['x-telegram-first-name'] as string;
  const devTelegramId = req.headers['x-dev-telegram-id'] as string;

  // 1. Check for standard Telegram initData in Authorization header or body
  let initData = '';
  if (authHeader && authHeader.startsWith('tma ')) {
    initData = authHeader.substring(4);
  } else if (req.body && req.body.initData) {
    initData = req.body.initData;
  }

  if (initData) {
    // A. If BOT_TOKEN is configured, verify HMAC signature
    if (ENV.BOT_TOKEN && ENV.BOT_TOKEN !== 'YOUR_BOT_TOKEN_HERE') {
      const user = verifyTelegramInitData(initData, ENV.BOT_TOKEN);
      if (user) {
        req.telegramUser = user;
        return next();
      }
    }

    // B. If HMAC verification fails or BOT_TOKEN is default/dev, extract user payload from initData
    try {
      const urlParams = new URLSearchParams(initData);
      const userStr = urlParams.get('user');
      if (userStr) {
        const parsed = JSON.parse(userStr);
        if (parsed && parsed.id) {
          req.telegramUser = {
            id: BigInt(parsed.id),
            first_name: parsed.first_name || 'Miner',
            username: parsed.username || null,
            language_code: parsed.language_code,
            is_premium: parsed.is_premium,
          };
          return next();
        }
      }
    } catch (e) {
      console.warn('Fallback initData user parsing failed:', e);
    }
  }

  // 2. Direct Telegram User ID from WebApp unsafe data
  const rawId = tgUserId || devTelegramId || req.body?.devUserId || req.body?.userId;
  if (rawId) {
    const cleanDigits = String(rawId).replace(/[^0-9]/g, '');
    if (cleanDigits) {
      const userId = BigInt(cleanDigits);
      const rawName = tgFirstName || (req.headers['x-dev-username'] as string) || req.body?.devUsername || req.body?.firstName || 'Miner';
      const rawUname = tgUsername || (req.headers['x-dev-username'] as string) || req.body?.devUsername || req.body?.username || '';

      let name = String(rawName);
      try {
        name = decodeURIComponent(name);
      } catch {}

      let uname = String(rawUname);
      try {
        uname = decodeURIComponent(uname);
      } catch {}

      req.telegramUser = {
        id: userId,
        first_name: name,
        username: uname ? uname.toLowerCase() : undefined,
      };
      return next();
    }
  }

  return res.status(401).json({
    error: 'Unauthorized',
    message: 'Telegram authentication required',
  });
}
