import type { Express, Request, Response } from 'express';
import { bot, registerMasterBotHandlers, setupBotCommands, getOrFetchBotUsername } from './bot.js';
import { ENV, getEffectiveWebhookUrl, shouldRunWebhook } from '../config/env.js';

export interface BotState {
  status: 'online' | 'disabled' | 'error';
  mode: 'webhook' | 'polling' | 'disabled';
  botUsername: string | null;
  webhookUrl: string | null;
  webhookUpdatesReceived: number;
  lastWebhookUpdateAt: string | null;
  startedAt: string | null;
  lastError: string | null;
}

const botState: BotState = {
  status: 'disabled',
  mode: 'disabled',
  botUsername: null,
  webhookUrl: null,
  webhookUpdatesReceived: 0,
  lastWebhookUpdateAt: null,
  startedAt: null,
  lastError: null,
};

/**
 * Returns the current bot execution state and telemetry
 */
export function getBotState(): BotState {
  return { ...botState };
}

/**
 * Handles incoming webhook POST updates from Telegram
 */
export async function handleWebhookUpdate(req: Request, res: Response) {
  if (ENV.BOT_WEBHOOK_SECRET) {
    const receivedSecret = req.headers['x-telegram-bot-api-secret-token'];
    if (receivedSecret !== ENV.BOT_WEBHOOK_SECRET) {
      console.warn('⚠️ [Telegram Webhook] Unauthorized update: Secret token mismatch.');
      return res.status(403).json({ error: 'Unauthorized webhook request' });
    }
  }

  if (!bot) {
    return res.status(503).json({ error: 'Telegram Bot not initialized' });
  }

  botState.webhookUpdatesReceived++;
  botState.lastWebhookUpdateAt = new Date().toISOString();

  try {
    // Process update through Telegraf engine
    await bot.handleUpdate(req.body, res);

    // If Telegraf did not end the response (webhookReply not used), send 200 OK
    if (!res.headersSent && !res.writableEnded) {
      res.status(200).send('OK');
    }
  } catch (err: any) {
    console.error('❌ [Telegram Webhook] Error processing update:', err.message || err);
    botState.lastError = err.message || 'Error processing update';
    // Always return 200 to Telegram so it does not retry failed updates indefinitely
    if (!res.headersSent && !res.writableEnded) {
      res.status(200).send('OK');
    }
  }
}

/**
 * Diagnostic endpoint for Telegram Webhook Info
 */
export async function handleGetWebhookInfo(req: Request, res: Response) {
  if (!bot) {
    return res.status(503).json({ error: 'Telegram Bot not initialized' });
  }

  try {
    const info = await bot.telegram.getWebhookInfo();
    return res.json({
      success: true,
      botState: getBotState(),
      telegramApiWebhookInfo: info,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to fetch webhook info from Telegram',
    });
  }
}

/**
 * Registers Express routes for webhook updates and diagnostics
 */
export function registerBotWebhookRoutes(app: Express) {
  const webhookPaths = new Set<string>(['/api/bot/webhook', '/api/telegram/webhook']);
  if (ENV.BOT_WEBHOOK_PATH) {
    const custom = ENV.BOT_WEBHOOK_PATH.startsWith('/') ? ENV.BOT_WEBHOOK_PATH : `/${ENV.BOT_WEBHOOK_PATH}`;
    webhookPaths.add(custom);
  }

  const pathsArray = Array.from(webhookPaths);

  // Incoming POST from Telegram Bot API
  app.post(pathsArray, handleWebhookUpdate);

  // Friendly GET status check for browser / health probes
  app.get(pathsArray, (req: Request, res: Response) => {
    res.json({
      status: 'active',
      service: 'NC TONs Telegram Bot Webhook Endpoint',
      mode: botState.mode,
      webhookUrl: botState.webhookUrl,
      updatesReceived: botState.webhookUpdatesReceived,
      lastUpdateAt: botState.lastWebhookUpdateAt,
      message: 'Awaiting incoming POST updates from Telegram Bot API.',
    });
  });

  // Webhook live info from Telegram API
  app.get(['/api/bot/webhook-info', '/api/telegram/webhook-info'], handleGetWebhookInfo);
}

/**
 * Initializes and starts the Telegram Bot engine with automatic Webhook or Polling mode
 */
export async function initBotEngine(app: Express): Promise<BotState> {
  // Always register the webhook routes on Express
  registerBotWebhookRoutes(app);

  if (!bot) {
    console.warn('⚠️ BOT_TOKEN is empty or default. Telegram Bot engine disabled.');
    botState.status = 'disabled';
    botState.mode = 'disabled';
    return botState;
  }

  try {
    const detectedUsername = await getOrFetchBotUsername();
    if (detectedUsername) {
      botState.botUsername = detectedUsername;
      console.log(`🤖 Telegram Bot username verified from token: @${detectedUsername}`);
    }
  } catch (e: any) {
    console.warn('⚠️ Bot auto-detection warning:', e.message);
  }

  // Register master specification command and callback handlers
  registerMasterBotHandlers(bot);
  await setupBotCommands(bot);

  const isWebhook = shouldRunWebhook();
  const webhookUrl = getEffectiveWebhookUrl();

  botState.startedAt = new Date().toISOString();

  if (isWebhook && webhookUrl) {
    // =========================================================================
    // WEBHOOK MODE (Optimal for Render Free Service to prevent sleep & cold boots)
    // =========================================================================
    botState.mode = 'webhook';
    botState.webhookUrl = webhookUrl;

    try {
      console.log(`🔗 Registering Telegram Bot Webhook at: ${webhookUrl}`);
      await bot.telegram.setWebhook(webhookUrl, {
        drop_pending_updates: true,
        secret_token: ENV.BOT_WEBHOOK_SECRET || undefined,
        max_connections: 40,
      });

      botState.status = 'online';
      console.log(`✅ Telegram Bot WEBHOOK registered successfully! Incoming updates will route via Render HTTP.`);
    } catch (err: any) {
      console.error(`❌ Failed to register Telegram Webhook with Telegram API:`, err.message || err);
      botState.status = 'error';
      botState.lastError = err.message || 'Webhook registration failed';
    }
  } else {
    // =========================================================================
    // POLLING MODE (Local development or when no public HTTPS domain is available)
    // =========================================================================
    botState.mode = 'polling';
    botState.webhookUrl = null;

    try {
      // Clear any prior webhook so Telegram does not throw 409 Conflict on getUpdates
      await bot.telegram.deleteWebhook({ drop_pending_updates: false });
      console.log('🧹 Cleaned up existing Telegram webhook before launching polling mode.');
    } catch (delErr: any) {
      console.warn('⚠️ deleteWebhook warning:', delErr.message);
    }

    bot.launch({ dropPendingUpdates: true })
      .then(() => {
        botState.status = 'online';
        console.log('🤖 Telegram Bot POLLING started successfully.');
      })
      .catch((err) => {
        botState.status = 'error';
        botState.lastError = err.message;
        console.warn('⚠️ Telegram Bot could not start polling:', err.message);
      });
  }

  return botState;
}

/**
 * Gracefully stops the Telegram bot instance if running
 */
export function stopBotEngine(signal: string = 'SIGTERM') {
  if (bot && botState.mode === 'polling' && (bot as any).polling) {
    try {
      bot.stop(signal);
      console.log(`🛑 Telegram Bot polling stopped (${signal})`);
    } catch {
      // ignore
    }
  }
}
