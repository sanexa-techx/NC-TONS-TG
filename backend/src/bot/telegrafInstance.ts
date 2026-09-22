import { Telegraf } from 'telegraf';
import { ENV } from '../config/env.js';

let botInstance: Telegraf | null = null;

if (ENV.BOT_TOKEN && ENV.BOT_TOKEN !== 'YOUR_BOT_TOKEN_HERE') {
  try {
    botInstance = new Telegraf(ENV.BOT_TOKEN);
    console.log('🤖 Telegraf Bot initialized successfully');
  } catch (err) {
    console.error('Failed to initialize Telegraf Bot:', err);
  }
} else {
  console.warn('⚠️ BOT_TOKEN is empty or default. Telegram Bot polling/webhooks will be disabled in dev mode.');
}

export const bot = botInstance;
