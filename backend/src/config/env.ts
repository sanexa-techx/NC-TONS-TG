import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/nctons?schema=public'),
  BOT_TOKEN: z.string().default(''),
  ADMIN_TELEGRAM_IDS: z.string().default(''),
  ADMIN_CHANNEL_ID: z.string().default(''),
  WEBAPP_URL: z.string().default('http://localhost:5173'),
  ALLOW_DEV_AUTH: z.string().default('true').transform((v) => v === 'true'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

export const ENV = parsedEnv.data;

export const adminIdsSet = new Set<string>(
  ENV.ADMIN_TELEGRAM_IDS.split(',')
    .map((id) => id.trim())
    .filter(Boolean)
);

export function isAdmin(telegramId: string | number | bigint): boolean {
  return adminIdsSet.has(telegramId.toString());
}
