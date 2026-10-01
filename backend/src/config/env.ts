import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const envSchema = z.object({
  PORT: z.union([z.string(), z.number()]).default('5000').transform((v) => Number(v)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/nctons?schema=public'),
  BOT_TOKEN: z.string().default(''),
  ADMIN_TELEGRAM_IDS: z.string().default('123456789,7859846205,7717683661'),
  ADMIN_CHANNEL_ID: z.string().default(''),
  PUBLIC_PAYOUT_CHANNEL_ID: z.string().default(''),
  WITHDRAWAL_GROUP_ID: z.string().default(''),
  WITHDRAWAL_CHANNEL_ID: z.string().default(''),
  WEBAPP_URL: z.string().default('http://localhost:5173'),
  ALLOW_DEV_AUTH: z.union([z.string(), z.boolean()]).default('false').transform((v) => String(v) === 'true'),
  NOTION_API_KEY: z.string().default(''),
  NOTION_WITHDRAWALS_DATABASE_ID: z.string().default(''),
  NOTION_TASKS_DATABASE_ID: z.string().default(''),

  // Telegram Webhook & Render Keep-Alive Settings
  BOT_MODE: z.enum(['auto', 'webhook', 'polling']).default('auto'),
  BOT_WEBHOOK_URL: z.string().default(''),
  RENDER_EXTERNAL_URL: z.string().default(''),
  BOT_WEBHOOK_PATH: z.string().default('/api/bot/webhook'),
  BOT_WEBHOOK_SECRET: z.string().default(''),
  ENABLE_SELF_PING: z.union([z.string(), z.boolean()]).default('true').transform((v) => String(v) === 'true'),
  KEEP_ALIVE_URL: z.string().default(''),
});

let parsedData: z.infer<typeof envSchema>;
try {
  parsedData = envSchema.parse(process.env);
} catch (err: any) {
  console.error('❌ Invalid environment variables:', err.errors || err);
  process.exit(1);
}

export const ENV = parsedData;

/**
 * Resolves the effective public Telegram Webhook URL.
 * Prioritizes explicit BOT_WEBHOOK_URL / WEBHOOK_URL, then Render's RENDER_EXTERNAL_URL.
 */
export function getEffectiveWebhookUrl(): string {
  const explicitUrl = (process.env.BOT_WEBHOOK_URL || ENV.BOT_WEBHOOK_URL || process.env.WEBHOOK_URL || '').trim();
  const rawPath = (ENV.BOT_WEBHOOK_PATH || '/api/bot/webhook').trim();
  const webhookPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;

  if (explicitUrl) {
    if (explicitUrl.startsWith('http://') || explicitUrl.startsWith('https://')) {
      try {
        const u = new URL(explicitUrl);
        // If no custom subpath was given, append the configured webhook path
        if (!u.pathname || u.pathname === '/') {
          u.pathname = webhookPath;
        }
        return u.toString();
      } catch {
        return explicitUrl;
      }
    }
  }

  // Render automatically provides RENDER_EXTERNAL_URL for web services (e.g. https://nctons-backend.onrender.com)
  const renderUrl = (process.env.RENDER_EXTERNAL_URL || ENV.RENDER_EXTERNAL_URL || '').trim();
  if (renderUrl) {
    const clean = renderUrl.replace(/\/+$/, '');
    return `${clean}${webhookPath}`;
  }

  return '';
}

/**
 * Checks whether the bot should run in Webhook mode or Polling mode
 */
export function shouldRunWebhook(): boolean {
  if (ENV.BOT_MODE === 'webhook') return true;
  if (ENV.BOT_MODE === 'polling') return false;

  // 'auto' mode: Use webhook if an HTTPS/HTTP URL is detected (e.g. on Render or with tunnel)
  const url = getEffectiveWebhookUrl();
  return Boolean(url && (url.startsWith('https://') || url.startsWith('http://')));
}

export function getAdminIds(): Set<string> {
  const raw = process.env.ADMIN_TELEGRAM_IDS || ENV.ADMIN_TELEGRAM_IDS || '';
  return new Set<string>(
    raw
      .split(/[,;\s]+/)
      .map((id) => id.trim())
      .filter(Boolean)
  );
}

export const adminIdsSet = getAdminIds();

export function isAdmin(telegramId: string | number | bigint | null | undefined): boolean {
  if (!telegramId) return false;
  const targetId = telegramId.toString().trim();
  const currentSet = getAdminIds();
  return currentSet.has(targetId);
}
