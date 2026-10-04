// server/bot.ts
import { Telegraf, Markup } from "telegraf";
import { pool } from "./config/db.js";
import { checkUserMembership } from "./services/membership.js";

export const bot = new Telegraf(process.env.BOT_TOKEN || "");

const ADMIN_IDS = (process.env.ADMIN_TELEGRAM_IDS || "")
  .split(",")
  .map((id) => parseInt(id.trim(), 10))
  .filter((id) => !isNaN(id));

const WEBAPP_URL = process.env.WEBAPP_URL || "https://nctons-tg.netlify.app";

// ============================================================================
// 1. IN-MEMORY RATE LIMITER & FLOOD CONTROL (Anti-Spam)
// ============================================================================
const userMessageTimestamps = new Map<number, number[]>();

export function checkRateLimit(userId: number): { allowed: boolean; violationCount?: number } {
  const now = Date.now();
  const timestamps = userMessageTimestamps.get(userId) || [];

  // Keep timestamps within the last 4 seconds
  const recent = timestamps.filter((t) => now - t < 4000);
  recent.push(now);
  userMessageTimestamps.set(userId, recent);

  // If more than 3 actions in 4 seconds, flag rate limit
  if (recent.length > 3) {
    return { allowed: false, violationCount: recent.length };
  }
  return { allowed: true };
}

// Cleanup inactive rate-limit records every 10 minutes
setInterval(() => {
  const cutoff = Date.now() - 60000;
  for (const [userId, times] of userMessageTimestamps.entries()) {
    if (times.length === 0 || times[times.length - 1] < cutoff) {
      userMessageTimestamps.delete(userId);
    }
  }
}, 10 * 60 * 1000);

// ============================================================================
// 2. GLOBAL SECURITY & BOT INTERCEPTOR MIDDLEWARE
// ============================================================================
bot.use(async (ctx, next) => {
  const from = ctx.from;
  if (!from) return; // Drop updates without sender context

  // 1. Drop automated bot accounts
  if (from.is_bot) {
    return;
  }

  // 2. Enforce Sliding-Window Rate Limit
  const rate = checkRateLimit(from.id);
  if (!rate.allowed) {
    if (rate.violationCount && rate.violationCount > 7) {
      // Auto-ban persistent spammers
      await pool.query(
        "UPDATE users SET is_banned = TRUE, ban_reason = 'Automated Command Flood / Spam Script' WHERE id = $1",
        [from.id]
      ).catch(() => {});
      return ctx.reply("⛔ Your account has been permanently blacklisted for automated command spamming.");
    }
    return ctx.reply("⚠️ Too many requests. Please slow down.");
  }

  // 3. Drop Banned Accounts
  try {
    const banRes = await pool.query(
      "SELECT is_banned, ban_reason FROM users WHERE id = $1",
      [from.id]
    );
    if (banRes.rows.length > 0 && banRes.rows[0].is_banned) {
      return ctx.reply(`🚫 Account Suspended: ${banRes.rows[0].ban_reason || "Fair-Play Violation"}`);
    }
  } catch (err) {
    console.error("Middleware DB error:", err);
  }

  return next();
});

// ============================================================================
// 3. HUMAN VERIFICATION CAPTCHA STATE (For /start and Referrals)
// ============================================================================
export interface CaptchaSession {
  targetEmoji: string;
  referrerId: number | null;
  createdAt: number;
}
export const pendingCaptchas = new Map<number, CaptchaSession>();

export const CAPTCHA_EMOJIS = [
  { name: "Diamond", symbol: "💎", id: "gem" },
  { name: "Rocket", symbol: "🚀", id: "rock" },
  { name: "Battery", symbol: "🔋", id: "bat" },
  { name: "Lightning", symbol: "⚡", id: "bolt" },
];

bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const rawText = ctx.message && "text" in ctx.message ? ctx.message.text : "";
  const startPayload = ctx.payload || (rawText.split(" ").length > 1 ? rawText.split(" ")[1] : ""); // ref_123456789

  // Check if user already exists in database
  const userCheck = await pool.query("SELECT id FROM users WHERE id = $1", [userId]);

  if (userCheck.rows.length === 0) {
    // Parse referrer ID
    let referrerId: number | null = null;
    if (startPayload && startPayload.startsWith("ref_")) {
      const parsed = parseInt(startPayload.replace("ref_", ""), 10);
      if (!isNaN(parsed) && parsed !== userId) {
        referrerId = parsed;
      }
    }

    // Pick a random target emoji for human verification
    const target = CAPTCHA_EMOJIS[Math.floor(Math.random() * CAPTCHA_EMOJIS.length)];
    pendingCaptchas.set(userId, {
      targetEmoji: target.id,
      referrerId,
      createdAt: Date.now(),
    });

    // Shuffle buttons to prevent automated position-clicking scripts
    const shuffled = [...CAPTCHA_EMOJIS].sort(() => Math.random() - 0.5);
    const buttons = shuffled.map((item) =>
      Markup.button.callback(item.symbol, `captcha_verify:${item.id}`)
    );

    return ctx.reply(
      `🛡️ <b>Human Verification Required</b>\n\n` +
      `To prevent bot syndicates, please prove you are human.\n\n` +
      `👉 Tap the <b>${target.name} (${target.symbol})</b> below to continue:`,
      {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([buttons]),
      }
    );
  }

  // Existing users: check mandatory channel subscription
  return proceedToApp(ctx);
});

// Captcha Verification Callback
bot.action(/^captcha_verify:([a-z]+)$/, async (ctx) => {
  const userId = ctx.from.id;
  const selectedEmojiId = ctx.match[1];
  const session = pendingCaptchas.get(userId);

  if (!session) {
    return ctx.answerCbQuery("Session expired. Please send /start again.", { show_alert: true });
  }

  // Failed Captcha
  if (session.targetEmoji !== selectedEmojiId) {
    pendingCaptchas.delete(userId);
    return ctx.editMessageText(
      "❌ <b>Verification Failed!</b>\n\nAutomated behavior suspected. Send /start to retry.",
      { parse_mode: "HTML" }
    );
  }

  // Passed Captcha: Execute atomic user creation & reward allocation
  pendingCaptchas.delete(userId);
  await ctx.answerCbQuery("✅ Human verified!");

  const firstName = ctx.from.first_name || "Miner";
  const username = ctx.from.username || null;
  const isPremium = !!(ctx.from as any).is_premium;
  const referrerId = session.referrerId;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const bonusNc = isPremium ? 2500 : 1000;
    const bonusTon = isPremium ? 0.000200 : 0.000080;
    const starterNc = isPremium ? 2000 : 1000;

    await client.query(
      `INSERT INTO users (id, first_name, username, nc_balance, referred_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [userId, firstName, username, starterNc, referrerId]
    );

    // If verified referee joined via referral link
    if (referrerId) {
      const refCheck = await client.query("SELECT id FROM users WHERE id = $1", [referrerId]);
      if (refCheck.rows.length > 0) {
        await client.query(
          `INSERT INTO referrals (referrer_id, referee_id, is_premium, bonus_nc, bonus_ton)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT DO NOTHING`,
          [referrerId, userId, isPremium, bonusNc, bonusTon]
        );

        await client.query(
          `UPDATE users 
           SET referral_count = referral_count + 1,
               unclaimed_referral_nc = unclaimed_referral_nc + $1,
               unclaimed_referral_ton = unclaimed_referral_ton + $2,
               total_referral_nc = total_referral_nc + $1,
               total_referral_ton = total_referral_ton + $2
           WHERE id = $3`,
          [bonusNc, bonusTon, referrerId]
        );

        await bot.telegram.sendMessage(
          referrerId,
          `👥 <b>New Verified Referral!</b>\n\n` +
          `Your friend <b>${firstName}</b> passed verification and joined.\n` +
          `🎁 Stashed: <b>+${bonusNc} NC</b> and <b>+${bonusTon.toFixed(6)} TON</b>!`,
          { parse_mode: "HTML" }
        ).catch(() => {});
      }
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Verified registration error:", err);
  } finally {
    client.release();
  }

  return proceedToApp(ctx);
});

// Helper to route verified users through the Force-Join check
export async function proceedToApp(ctx: any) {
  const userId = ctx.from.id;
  const firstName = ctx.from.first_name || "Miner";

  // Check mandatory channels & groups
  const { allJoined, channels } = await checkUserMembership(userId);

  if (!allJoined) {
    const unjoined = channels.filter((c) => !c.isMember);
    const keyboard: any[][] = unjoined.map((c) => [
      Markup.button.url(`Join ${c.title} 🔗`, c.inviteLink),
    ]);
    keyboard.push([Markup.button.callback("I Have Joined All ✅", "check_bot_membership")]);

    return ctx.reply(
      `👋 <b>Welcome, ${firstName}!</b>\n\n` +
      `Join our required community channels to unlock access:\n\n` +
      unjoined.map((c) => `• <b>${c.title}</b>`).join("\n") +
      `\n\n<i>Click the buttons below to join, then tap "I Have Joined All".</i>`,
      {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard(keyboard),
      }
    );
  }

  // All checks cleared: Launch App
  return ctx.reply(
    `⚡ <b>Access Granted! Welcome to NC TONs.</b>\n\n` +
    `Your human status is verified and channel memberships are active.\n` +
    `Tap below to launch the mining grid:`,
    {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.webApp("Launch NC TONs 🚀", WEBAPP_URL)],
      ]),
    }
  );
}

// Action callback for checking membership
bot.action("check_bot_membership", async (ctx) => {
  return proceedToApp(ctx);
});

// Re-export full bot module utilities for backward compatibility
export {
  registerMasterBotHandlers,
  setupBotCommands,
  getOrFetchBotUsername,
  getMainMenuKeyboard,
  maskAddress,
  maskUserId,
} from "../backend/src/bot/bot.js";
