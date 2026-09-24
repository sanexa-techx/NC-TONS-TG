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
  ADMIN_TELEGRAM_IDS: z.string().default('123456789'),
  ADMIN_CHANNEL_ID: z.string().default(''),
  PUBLIC_PAYOUT_CHANNEL_ID: z.string().default(''),
  WEBAPP_URL: z.string().default('http://localhost:5173'),
  ALLOW_DEV_AUTH: z.union([z.string(), z.boolean()]).default('true').transform((v) => String(v) === 'true'),
  NOTION_API_KEY: z.string().default(''),
  NOTION_WITHDRAWALS_DATABASE_ID: z.string().default(''),
  NOTION_TASKS_DATABASE_ID: z.string().default(''),
});

let parsedData: z.infer<typeof envSchema>;
try {
  parsedData = envSchema.parse(process.env);
} catch (err: any) {
  console.error('❌ Invalid environment variables:', err.errors || err);
  process.exit(1);
}

export const ENV = parsedData;

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
