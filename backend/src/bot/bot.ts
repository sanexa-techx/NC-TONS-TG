import { Telegraf, Markup } from 'telegraf';
import { pool } from '../db/index.js';
import { ENV, isAdmin, getAdminIds } from '../config/env.js';
import { MiningReminderService } from '../services/miningReminderService.js';

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

let cachedBotUsername: string | null = null;

/**
 * Automatically detects and returns the Telegram Bot's real username from Telegram API via BOT_TOKEN
 */
export async function getOrFetchBotUsername(): Promise<string> {
  const current = cachedBotUsername;
  if (current) {
    return current;
  }

  // 1. Check if process.env.BOT_USERNAME or ENV.BOT_USERNAME is explicitly configured
  const envUsername = (process.env.BOT_USERNAME || (ENV as any).BOT_USERNAME || '').replace('@', '').trim();
  if (envUsername) {
    cachedBotUsername = envUsername;
    return envUsername;
  }

  // 2. Automatically query Telegram API with the bot token
  if (botInstance) {
    try {
      if (botInstance.botInfo?.username) {
        const u = botInstance.botInfo.username.replace('@', '').trim();
        cachedBotUsername = u;
        return u;
      }

      const me = await botInstance.telegram.getMe();
      if (me && me.username) {
        const u = me.username.replace('@', '').trim();
        cachedBotUsername = u;
        botInstance.botInfo = me;
        console.log(`🤖 Automatically detected Telegram Bot username from token: @${u}`);
        return u;
      }
    } catch (err: any) {
      console.warn('⚠️ Could not automatically fetch bot username from Telegram API:', err.message);
    }
  }

  return '';
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function maskAddress(addr: string): string {
  if (!addr || addr.length <= 10) return addr || 'Unknown';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function maskUserId(id: string | number | bigint): string {
  const str = id.toString();
  if (str.length <= 4) return str;
  return `${str.slice(0, 3)}****${str.slice(-2)}`;
}

/**
 * Main Persistent Menu Keyboard (Reply Keyboard) for users
 * Replaces typed slash commands with one-tap interactive menu buttons
 */
export function getMainMenuKeyboard(webappUrl: string) {
  return Markup.keyboard([
    [Markup.button.webApp('⛏️ Launch NC TONs 🚀', webappUrl)],
    [Markup.button.text('📊 Balance & Stats'), Markup.button.text('👥 Invite Friends')],
    [Markup.button.text('🎁 Daily Check-in'), Markup.button.text('ℹ️ Guide & Rules')],
  ]).resize();
}

/**
 * Configure bot menu:
 * 1. Hide slash commands menu from regular users
 * 2. Configure Telegram bottom-left Menu Button to launch the WebApp directly
 * 3. Scope administrative commands strictly to verified admin chats
 */
export async function setupBotCommands(b: Telegraf) {
  const WEBAPP_URL = process.env.WEBAPP_URL || ENV.WEBAPP_URL;

  // 1. Hide slash commands menu from regular users
  try {
    await b.telegram.deleteMyCommands({ scope: { type: 'default' } });
    console.log('✅ Bot slash commands hidden for users (menu button mode active)');
  } catch (err: any) {
    console.warn('Could not clear default bot commands:', err.message);
  }

  // 2. Set Telegram Chat Menu Button to directly open the Mini App
  if (WEBAPP_URL && WEBAPP_URL.startsWith('http')) {
    try {
      await b.telegram.setChatMenuButton({
        menuButton: {
          type: 'web_app',
          text: '⛏️ Play / Mine',
          web_app: { url: WEBAPP_URL },
        },
      });
      console.log('✅ Telegram Chat Menu button set to WebApp launcher');
    } catch (err: any) {
      console.warn('Could not set chat menu button:', err.message);
    }
  }

  // 3. Register commands only for admins in their private chats
  const adminIds = getAdminIds();
  for (const adminId of adminIds) {
    const numId = parseInt(adminId, 10);
    if (!isNaN(numId)) {
      try {
        await b.telegram.setMyCommands(
          [
            { command: 'admin', description: '🛡️ Admin Command Center' },
            { command: 'ban', description: '🚫 Ban user: /ban <id> <reason>' },
            { command: 'unban', description: '✅ Unban user: /unban <id>' },
            { command: 'audit', description: '🔍 Audit device & fraud logs: /audit <id>' },
            { command: 'broadcast', description: '📢 Global broadcast' },
            { command: 'stop_broadcast', description: '🛑 Stop active broadcast' },
            { command: 'stats_global', description: '🌐 Global platform metrics' },
            { command: 'check_reminders', description: '🔋 Sweep mining reminders' },
          ],
          { scope: { type: 'chat', chat_id: numId } }
        );
      } catch {
        // Admin might not have initiated a chat with the bot yet
      }
    }
  }
}

/**
 * Register all Master Specification Bot handlers on the Telegraf instance
 */
export function registerMasterBotHandlers(b: Telegraf) {
  const WEBAPP_URL = process.env.WEBAPP_URL || ENV.WEBAPP_URL;
  const ADMIN_CHANNEL_ID = process.env.ADMIN_CHANNEL_ID || ENV.ADMIN_CHANNEL_ID;
  const PUBLIC_PAYOUT_CHANNEL_ID = process.env.PUBLIC_PAYOUT_CHANNEL_ID || ENV.PUBLIC_PAYOUT_CHANNEL_ID;

  // ============================================================================
  // 1. DEEP-LINK ONBOARDING & LAUNCHER (/start)
  // ============================================================================
  b.start(async (ctx) => {
    try {
      const from = ctx.from;
      if (!from) return;

      const rawText = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
      const textParts = rawText.split(' ');
      const startPayload = ctx.payload || (textParts.length > 1 ? textParts[1] : '');

      const newUserId = from.id;
      const firstName = from.first_name || 'Miner';
      const username = from.username || null;
      const isPremium = Boolean((from as any).is_premium);

      let referrerId: number | null = null;
      if (startPayload && startPayload.startsWith('ref_')) {
        const parsedId = parseInt(startPayload.replace('ref_', '').trim(), 10);
        if (!isNaN(parsedId) && parsedId !== newUserId) {
          referrerId = parsedId;
        }
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [newUserId]);

        if (userCheck.rows.length === 0) {
          let starterNc = isPremium ? 2000 : 1000;
          let bonusNc = isPremium ? 2500 : 1000;
          let bonusTon = isPremium ? 0.000200 : 0.000080;

          // Anti-Fraud: check if referee and referrer share an active device or IP address
          let hasClash = false;
          if (referrerId) {
            try {
              const clashCheck = await client.query(
                `SELECT 1 FROM user_devices d1
                 JOIN user_devices d2 ON (d1.device_hash = d2.device_hash OR d1.ip_address = d2.ip_address)
                 WHERE d1.user_id = $1 AND d2.user_id = $2`,
                [referrerId, newUserId]
              );
              if (clashCheck.rows.length > 0) {
                hasClash = true;
              }
            } catch (clashErr) {
              console.warn('[Anti-Cheat] Referral clash check error:', clashErr);
            }
          }

          if (hasClash) {
            // Silent Fraud Mitigation: register user without awarding rewards to referrer
            await client.query(
              'INSERT INTO users (id, first_name, username, nc_balance, risk_score, referred_by) VALUES ($1, $2, $3, 500, 75, $4)',
              [newUserId, firstName, username, referrerId]
            );
            // Log fraud event
            await client.query(
              `INSERT INTO security_audit_logs (user_id, event_type, severity, details)
               VALUES ($1, 'REFERRAL_CLASH_ON_START', 'HIGH', $2)`,
              [newUserId, JSON.stringify({ referrerId })]
            );
          } else {
            try {
              const refCfg = await client.query(
                "SELECT action_type, nc_reward, ton_reward FROM reward_configs WHERE action_type IN ('referral_standard', 'referral_premium')"
              );
              for (const row of refCfg.rows) {
                if (row.action_type === 'referral_standard' && !isPremium) {
                  bonusNc = Number(row.nc_reward);
                  bonusTon = parseFloat(row.ton_reward);
                } else if (row.action_type === 'referral_premium' && isPremium) {
                  bonusNc = Number(row.nc_reward);
                  bonusTon = parseFloat(row.ton_reward);
                }
              }
            } catch {
              // fallback defaults
            }

            await client.query(
              `INSERT INTO users (id, first_name, username, nc_balance, referred_by)
               VALUES ($1, $2, $3, $4, $5)`,
              [newUserId, firstName, username, starterNc, referrerId]
            );

            if (referrerId) {
              const refCheck = await client.query('SELECT id FROM users WHERE id = $1', [referrerId]);
              if (refCheck.rows.length > 0) {
                await client.query(
                  `INSERT INTO referrals (referrer_id, referee_id, is_premium, bonus_nc, bonus_ton)
                   VALUES ($1, $2, $3, $4, $5)`,
                  [referrerId, newUserId, isPremium, bonusNc, bonusTon]
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

                await b.telegram
                  .sendMessage(
                    referrerId,
                    `👥 <b>New Referral Joined!</b>\n\n` +
                      `Your friend <b>${firstName}</b> just started mining.\n` +
                      `🎁 Bounty Stashed: <b>+${bonusNc.toLocaleString()} NC</b> and <b>+${bonusTon.toFixed(6)} TON</b>!`,
                    { parse_mode: 'HTML' }
                  )
                  .catch(() => {});
              }
            }
          }
        }

        await client.query('COMMIT');
      } catch (dbErr) {
        await client.query('ROLLBACK');
        console.error('Bot /start registration error:', dbErr);
      } finally {
        client.release();
      }

      const launchUrl = `${WEBAPP_URL}?userId=${newUserId}&firstName=${encodeURIComponent(firstName)}${username ? `&username=${encodeURIComponent(username)}` : ''}`;

      await ctx.reply(
        `⚡ <b>Welcome to NC TONs, ${firstName}!</b>\n\n` +
          `Mine real TON, play arcade games, and earn daily rewards directly inside Telegram.\n\n` +
          `🔋 <i>Keep your battery charged to maintain continuous mining!</i>\n\n` +
          `👇 <b>Tap the menu buttons below to begin!</b>`,
        {
          parse_mode: 'HTML',
          ...getMainMenuKeyboard(launchUrl),
        }
      );

      return ctx.reply(
        `🚀 <b>Launch NC TONs Rig:</b>\nClick below to open your mining rig or join the community.`,
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [Markup.button.webApp('Launch NC TONs 🚀', launchUrl)],
            [Markup.button.url('Official Updates Channel 📢', 'https://t.me/nctons_official')],
          ]),
        }
      );
    } catch (err) {
      console.error('Error handling /start command:', err);
    }
  });

  // ============================================================================
  // 2. USER MENU BUTTONS & ACTIONS (Balance, Referral, Daily, Guide)
  // ============================================================================
  const handleStats = async (ctx: any) => {
    try {
      const from = ctx.from;
      if (!from) return;
      const res = await pool.query('SELECT * FROM users WHERE id = $1', [from.id]);
      const launchUrl = `${WEBAPP_URL}?userId=${from.id}`;
      if (res.rows.length === 0) {
        return ctx.reply('⚠️ No miner profile found. Tap Launch NC TONs below to begin mining!', {
          ...getMainMenuKeyboard(launchUrl),
        });
      }
      const u = res.rows[0];
      const tonVal = parseFloat(u.ton_balance || 0).toFixed(6);
      const ncVal = Number(u.nc_balance || 0).toLocaleString();

      return ctx.reply(
        `📊 <b>Miner Operator Statistics</b>\n\n` +
          `🆔 <b>ID:</b> <code>${u.id}</code>\n` +
          `👤 <b>Operator:</b> ${u.first_name} ${u.username ? `(@${u.username})` : ''}\n` +
          `💎 <b>TON Balance:</b> <code>${tonVal} TON</code>\n` +
          `🪙 <b>NC Fuel Balance:</b> <code>${ncVal} NC</code>\n` +
          `🔋 <b>Rig Battery:</b> <code>${u.power_percentage}%</code>\n` +
          `👥 <b>Recruited Friends:</b> <code>${u.referral_count || 0}</code>\n` +
          `📅 <b>Daily Streak:</b> <code>${u.daily_streak || 0} Days</code>\n\n` +
          `Tap below to open your mining rig:`,
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([[Markup.button.webApp('Launch Mining Rig ⛏️', launchUrl)]]),
        }
      );
    } catch (err) {
      return ctx.reply('❌ Error fetching your stats.');
    }
  };

  const handleReferral = async (ctx: any) => {
    try {
      const from = ctx.from;
      if (!from) return;
      const botUsername = ctx.botInfo?.username || (await getOrFetchBotUsername());
      const refLink = botUsername
        ? `https://t.me/${botUsername}?start=ref_${from.id}`
        : `${WEBAPP_URL}?ref=${from.id}`;
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent('Mine real TON coins with me on NC TONs! ⛏️💎')}`;
      const launchUrl = `${WEBAPP_URL}?userId=${from.id}`;

      return ctx.reply(
        `👥 <b>NC TONs Referral Program</b>\n\n` +
          `Invite friends and earn bonus cryptocurrency from their mining!\n\n` +
          `🎁 <b>Standard Friends:</b> +1,000 NC & +0.000080 TON\n` +
          `⭐ <b>Telegram Premium:</b> +2,500 NC & +0.000200 TON\n\n` +
          `🔗 <b>Your Personal Referral Link:</b>\n<code>${refLink}</code>`,
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [Markup.button.url('🚀 Share With Friends', shareUrl)],
            [Markup.button.webApp('Open Squad in App 👥', launchUrl)],
          ]),
        }
      );
    } catch (err) {
      return ctx.reply('❌ Error generating referral link.');
    }
  };

  const handleDaily = async (ctx: any) => {
    try {
      const from = ctx.from;
      if (!from) return;
      const launchUrl = `${WEBAPP_URL}?userId=${from.id}`;
      return ctx.reply(
        `🎁 <b>Daily Streak & Check-in</b>\n\n` +
          `Claim ascending bonuses every calendar day to maintain your streak!\n\n` +
          `• <b>Day 1:</b> +100 NC\n` +
          `• <b>Day 2:</b> +250 NC\n` +
          `• <b>Day 3:</b> +500 NC & +0.000100 TON\n` +
          `• <b>Day 4:</b> +750 NC\n` +
          `• <b>Day 5:</b> +1,000 NC & +0.000200 TON\n` +
          `• <b>Day 6:</b> +1,500 NC\n` +
          `• <b>Day 7:</b> +3,000 NC & +0.000500 TON (Jackpot! 🎉)\n\n` +
          `Tap below to claim today's streak reward:`,
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [Markup.button.webApp('Claim Daily Streak 🎁', launchUrl)],
          ]),
        }
      );
    } catch (err) {
      return ctx.reply('❌ Error fetching daily check-in info.');
    }
  };

  const handleHelp = async (ctx: any) => {
    const from = ctx.from;
    const launchUrl = from ? `${WEBAPP_URL}?userId=${from.id}` : WEBAPP_URL;
    return ctx.reply(
      `ℹ️ <b>NC TONs — Miner Guide & Operations Manual</b>\n\n` +
        `⛏️ <b>Passive Mining:</b>\n` +
        `Your rig passively mints TON while you are away as long as your power battery is above 0%.\n\n` +
        `🔋 <b>Power Recharge:</b>\n` +
        `Use mined NC coins or watch quick sponsored clips to recharge your battery back to 100%.\n\n` +
        `🎮 <b>Arcade Arena:</b>\n` +
        `Play Memory Matrix, 2048, or Cyber Car Race to claim instant NC and TON bounties.\n\n` +
        `🎁 <b>Daily Check-in:</b>\n` +
        `Check in every calendar day to collect ascending rewards up to the Day 7 Jackpot.\n\n` +
        `👥 <b>Crew Referrals:</b>\n` +
        `Invite friends to earn +1,000 NC and +0.000080 TON (up to +2,500 NC and +0.000200 TON for Telegram Premium friends)!`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([[Markup.button.webApp('Open NC TONs 🚀', launchUrl)]]),
      }
    );
  };

  // Menu button handlers (and command fallbacks)
  b.hears(['📊 Balance & Stats', '📊 My Balance & Stats', 'Balance & Stats'], handleStats);
  b.command('stats', handleStats);

  b.hears(['👥 Invite Friends', '👥 Referral Link', 'Invite Friends'], handleReferral);
  b.command('ref', handleReferral);

  b.hears(['🎁 Daily Check-in', '🎁 Daily Rewards', 'Daily Check-in'], handleDaily);
  b.command('daily', handleDaily);

  b.hears(['ℹ️ Guide & Rules', 'ℹ️ How to Play', 'Guide & Rules'], handleHelp);
  b.command('help', handleHelp);

  const handleTerms = async (ctx: any) => {
    const termsUrl = `${WEBAPP_URL}/terms`;
    const fromId = ctx.from?.id || '';
    return ctx.reply(
      `📜 <b>NC TONs — Terms & Conditions</b>\n\n` +
        `• <b>Eligibility:</b> Players must be at least 18 years old or legal age of majority.\n` +
        `• <b>Mining & Battery:</b> Passive mining mints TON based on battery uptime. Battery can be recharged with NC fuel or sponsored clips.\n` +
        `• <b>Anti-Cheat:</b> Automated bots, multi-accounts, and tampered scores are strictly prohibited.\n` +
        `• <b>Withdrawals:</b> Non-custodial payouts to verified TON wallets upon fulfilling daily ad mission verification.\n\n` +
        `Read the full operational documentation below:`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.url('Read Full Terms & Conditions 📜', termsUrl)],
          [Markup.button.webApp('Launch Mining Rig ⛏️', `${WEBAPP_URL}?userId=${fromId}`)],
        ]),
      }
    );
  };

  const handlePrivacy = async (ctx: any) => {
    const privacyUrl = `${WEBAPP_URL}/privacy`;
    const fromId = ctx.from?.id || '';
    return ctx.reply(
      `🛡️ <b>NC TONs — Privacy Policy</b>\n\n` +
        `• <b>Data Minimalization:</b> We only receive basic Telegram metadata (ID, name, username, avatar) to sync your profile.\n` +
        `• <b>Zero Custody:</b> We never request or store private keys, seed phrases, or sensitive payment credentials.\n` +
        `• <b>Third-Party Services:</b> Anonymous IDs are shared with ad providers (Adsgram, Monetag) solely to reward gameplay.\n` +
        `• <b>Your Rights:</b> You have full control to disconnect your wallet or delete in-game data at any time.\n\n` +
        `Read the complete Privacy Policy below:`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.url('Read Complete Privacy Policy 🛡️', privacyUrl)],
          [Markup.button.webApp('Launch Mining Rig ⛏️', `${WEBAPP_URL}?userId=${fromId}`)],
        ]),
      }
    );
  };

  b.hears(['📜 Terms & Conditions', 'Terms & Conditions', 'Terms of Service', 'Terms'], handleTerms);
  b.command(['terms', 'tos'], handleTerms);

  b.hears(['🛡️ Privacy Policy', 'Privacy Policy', 'Privacy'], handlePrivacy);
  b.command('privacy', handlePrivacy);

  // ============================================================================
  // 3. ADMIN DASHBOARD & MENU (/admin)
  // ============================================================================
  b.command('admin', async (ctx) => {
    if (!ctx.from || !isAdmin(ctx.from.id)) {
      return ctx.reply('⛔ Unauthorized: Administrator permissions required.');
    }

    const adminName = ctx.from.first_name || 'Admin';

    return ctx.reply(
      `🛡️ <b>NC TONs — Administrator Command Center</b>\n\n` +
        `Welcome, <b>${adminName}</b>! You have verified system administrator rights.\n\n` +
        `<b>Available Operations:</b>\n` +
        `• <code>/ban &lt;userId&gt; &lt;reason&gt;</code>: Blacklist sybil/fraud account\n` +
        `• <code>/unban &lt;userId&gt;</code>: Lift ban and reset risk to 0\n` +
        `• <code>/audit &lt;userId&gt;</code>: Security report with device & GPU cluster footprints\n` +
        `• <code>/broadcast &lt;text&gt;</code>: Dispatch announcement to all miners and channels\n` +
        `• <code>/stop_broadcast</code>: Immediately halt an active broadcast in progress\n` +
        `• <i>Reply to any photo/video with</i> <code>/broadcast</code>: Rich media replication\n` +
        `• <code>/stats_global</code>: Live platform economics & miner telemetry\n` +
        `• <code>/check_reminders</code>: Sweep expired mining sessions & dispatch reminder DMs\n` +
        `• Review incoming payouts & social proofs directly in the Admin Channel`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.webApp('Open WebApp Admin Panel ⚡', `${WEBAPP_URL}?userId=${ctx.from.id}`)],
          [
            Markup.button.callback('📊 Global Telemetry', 'admin_cmd:stats_global'),
            Markup.button.callback('🔋 Sweep Reminders', 'admin_cmd:check_reminders'),
          ],
          [
            Markup.button.callback('🛑 Stop Running Broadcast', 'admin_stop_broadcast'),
          ],
          [
            Markup.button.url(
              'Private Review Channel 🔒',
              ADMIN_CHANNEL_ID.startsWith('-100')
                ? `https://t.me/c/${ADMIN_CHANNEL_ID.replace('-100', '')}/1`
                : 'https://t.me/'
            ),
          ],
        ]),
      }
    );
  });

  // ============================================================================
  // ANTI-CHEAT & MODERATION COMMANDS (/ban, /unban, /audit)
  // ============================================================================

  // 1. /ban <userId> <reason>
  b.command('ban', async (ctx) => {
    if (!ctx.from || !isAdmin(ctx.from.id)) return;
    const rawText = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const args = rawText.split(' ');
    const targetId = parseInt(args[1], 10);
    const reason = args.slice(2).join(' ') || 'Administrative Security Ban';

    if (isNaN(targetId)) {
      return ctx.reply('Usage: <code>/ban &lt;userId&gt; &lt;reason&gt;</code>', { parse_mode: 'HTML' });
    }

    await pool.query(
      'UPDATE users SET is_banned = TRUE, ban_reason = $1, risk_score = 100 WHERE id = $2',
      [reason, targetId]
    );

    return ctx.reply(`🚫 User <code>${targetId}</code> has been banned.\nReason: <i>${reason}</i>`, { parse_mode: 'HTML' });
  });

  // 2. /unban <userId>
  b.command('unban', async (ctx) => {
    if (!ctx.from || !isAdmin(ctx.from.id)) return;
    const rawText = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const targetId = parseInt(rawText.split(' ')[1], 10);

    if (isNaN(targetId)) {
      return ctx.reply('Usage: <code>/unban &lt;userId&gt;</code>', { parse_mode: 'HTML' });
    }

    await pool.query(
      'UPDATE users SET is_banned = FALSE, ban_reason = NULL, risk_score = 0 WHERE id = $1',
      [targetId]
    );

    return ctx.reply(`✅ User <code>${targetId}</code> has been unbanned and risk score reset to 0.`, { parse_mode: 'HTML' });
  });

  // 3. /audit <userId> - Inspect Device Footprints
  b.command('audit', async (ctx) => {
    if (!ctx.from || !isAdmin(ctx.from.id)) return;
    const rawText = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const targetId = parseInt(rawText.split(' ')[1], 10);

    if (isNaN(targetId)) {
      return ctx.reply('Usage: <code>/audit &lt;userId&gt;</code>', { parse_mode: 'HTML' });
    }

    const userRes = await pool.query(
      'SELECT id, first_name, username, risk_score, is_banned, last_ip_address FROM users WHERE id = $1',
      [targetId]
    );
    if (userRes.rows.length === 0) return ctx.reply('User not found.');

    const u = userRes.rows[0];
    const devices = await pool.query('SELECT * FROM user_devices WHERE user_id = $1', [targetId]);
    const logs = await pool.query(
      'SELECT event_type, severity, created_at FROM security_audit_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5',
      [targetId]
    );

    let reply =
      `🔍 <b>Security Audit Report</b>\n\n` +
      `👤 <b>User:</b> <code>${u.id}</code> (${u.first_name || 'Miner'})\n` +
      `⚠️ <b>Risk Score:</b> ${u.risk_score || 0}/100\n` +
      `🚫 <b>Status:</b> ${u.is_banned ? 'BANNED' : 'ACTIVE'}\n` +
      `🌐 <b>Last IP:</b> <code>${u.last_ip_address || 'None'}</code>\n\n` +
      `📱 <b>Connected Devices (${devices.rows.length}):</b>\n`;

    devices.rows.forEach((d: any) => {
      reply += `• Hash: <code>${(d.device_hash || '').slice(0, 10)}...</code> | GPU: <i>${(d.webgl_renderer || '').slice(0, 20)}</i>\n`;
    });

    if (logs.rows.length > 0) {
      reply += `\n🚨 <b>Recent Security Flags:</b>\n`;
      logs.rows.forEach((l: any) => {
        reply += `• [${l.severity}] <b>${l.event_type}</b>\n`;
      });
    }

    return ctx.reply(reply, { parse_mode: 'HTML' });
  });

  // ============================================================================
  // 4. GLOBAL PLATFORM TELEMETRY (/stats_global)
  // ============================================================================
  const handleStatsGlobal = async (ctx: any) => {
    if (!ctx.from || !isAdmin(ctx.from.id)) {
      if (ctx.answerCbQuery) return ctx.answerCbQuery('⛔ Unauthorized action.', { show_alert: true });
      return ctx.reply('⛔ Unauthorized: Administrator permissions required.');
    }

    try {
      const usersCountRes = await pool.query('SELECT COUNT(*) as cnt FROM users');
      const tonSumRes = await pool.query('SELECT SUM(ton_balance) as total_ton FROM users');
      const ncSumRes = await pool.query('SELECT SUM(nc_balance) as total_nc FROM users');
      const wdPendingRes = await pool.query("SELECT COUNT(*) as cnt, SUM(ton_amount) as sum FROM withdrawals WHERE status = 'PENDING'");
      const wdApprovedRes = await pool.query("SELECT COUNT(*) as cnt, SUM(ton_amount) as sum FROM withdrawals WHERE status = 'APPROVED'");
      const proofsPendingRes = await pool.query("SELECT COUNT(*) as cnt FROM task_proof_submissions WHERE status = 'PENDING_REVIEW'");
      const chatsCountRes = await pool.query('SELECT COUNT(*) as cnt FROM bot_chats');

      const totalUsers = usersCountRes.rows[0]?.cnt || 0;
      const totalTon = parseFloat(tonSumRes.rows[0]?.total_ton || 0).toFixed(4);
      const totalNc = Number(ncSumRes.rows[0]?.total_nc || 0).toLocaleString();
      const pendingWdCount = wdPendingRes.rows[0]?.cnt || 0;
      const pendingWdSum = parseFloat(wdPendingRes.rows[0]?.sum || 0).toFixed(4);
      const approvedWdCount = wdApprovedRes.rows[0]?.cnt || 0;
      const approvedWdSum = parseFloat(wdApprovedRes.rows[0]?.sum || 0).toFixed(4);
      const pendingProofs = proofsPendingRes.rows[0]?.cnt || 0;
      const trackedChats = chatsCountRes.rows[0]?.cnt || 0;

      const reminderStats = MiningReminderService.getStats();

      const message =
        `🌐 <b>NC TONs — Global Platform Telemetry</b>\n\n` +
        `👥 <b>Total Miners:</b> <code>${totalUsers}</code>\n` +
        `📢 <b>Tracked Channels/Groups:</b> <code>${trackedChats}</code>\n` +
        `💎 <b>Total User TON:</b> <code>${totalTon} TON</code>\n` +
        `🪙 <b>Total User NC:</b> <code>${totalNc} NC</code>\n\n` +
        `🔋 <b>Mining Reminders Sent:</b> <code>${reminderStats.totalRemindersSent}</code> (Worker: ${reminderStats.workerActive ? 'Active 🟢' : 'Off 🔴'})\n` +
        `🏦 <b>Pending Withdrawals:</b> <code>${pendingWdCount}</code> (${pendingWdSum} TON)\n` +
        `✅ <b>Paid Withdrawals:</b> <code>${approvedWdCount}</code> (${approvedWdSum} TON)\n` +
        `📸 <b>Pending Screenshot Proofs:</b> <code>${pendingProofs}</code>\n\n` +
        `⏰ <i>Data queried live at ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC</i>`;

      if (ctx.callbackQuery) {
        await ctx.answerCbQuery();
        return ctx.reply(message, { parse_mode: 'HTML' });
      }
      return ctx.reply(message, { parse_mode: 'HTML' });
    } catch (err: any) {
      console.error('Error generating global stats:', err);
      return ctx.reply('❌ Failed to compute global statistics.');
    }
  };

  b.command('stats_global', handleStatsGlobal);
  b.action('admin_cmd:stats_global', handleStatsGlobal);

  const handleCheckReminders = async (ctx: any) => {
    if (!ctx.from || !isAdmin(ctx.from.id)) {
      if (ctx.answerCbQuery) return ctx.answerCbQuery('⛔ Unauthorized action.', { show_alert: true });
      return ctx.reply('⛔ Unauthorized: Administrator permissions required.');
    }

    if (ctx.answerCbQuery) await ctx.answerCbQuery('⏳ Scanning miners...');
    const statusMsg = await ctx.reply('⏳ Scanning database for expired mining sessions...');
    const sent = await MiningReminderService.checkAndSendMiningReminders();
    const stats = MiningReminderService.getStats();

    return ctx.telegram.editMessageText(
      ctx.chat.id,
      statusMsg.message_id,
      undefined,
      `✅ <b>Mining Reminder Sweep Complete</b>\n\n` +
        `📨 <b>Reminders Sent This Sweep:</b> <code>${sent}</code>\n` +
        `📈 <b>Cumulative Sent:</b> <code>${stats.totalRemindersSent}</code>\n` +
        `⏱️ <b>Worker Status:</b> ${stats.workerActive ? 'Polling every 60s 🟢' : 'Inactive 🔴'}\n` +
        `⏰ <i>Sweep executed at ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC</i>`,
      { parse_mode: 'HTML' }
    );
  };

  b.command('check_reminders', handleCheckReminders);
  b.action('admin_cmd:check_reminders', handleCheckReminders);

  // ============================================================================
  // 5. WITHDRAWAL APPROVAL & REJECTION CALLBACKS
  // ============================================================================

  function escapeHtml(text: string | null | undefined): string {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  async function resolveWithdrawalTargetChatId(): Promise<string> {
    const fromEnv = (
      process.env.WITHDRAWAL_GROUP_ID ||
      process.env.WITHDRAWAL_CHANNEL_ID ||
      process.env.PUBLIC_PAYOUT_CHANNEL_ID ||
      process.env.PAYOUT_GROUP_ID ||
      process.env.PAYOUT_CHANNEL_ID ||
      process.env.WITHDRAWAL_PROOF_CHANNEL_ID ||
      process.env.PROOF_CHANNEL_ID ||
      (ENV as any).WITHDRAWAL_GROUP_ID ||
      (ENV as any).WITHDRAWAL_CHANNEL_ID ||
      ENV.PUBLIC_PAYOUT_CHANNEL_ID ||
      ''
    ).trim();

    if (fromEnv) return fromEnv;

    // Automatic fallback: detect payout channel or withdrawal group from bot_chats
    try {
      const res = await pool.query(
        `SELECT chat_id, title FROM bot_chats 
         WHERE title ILIKE '%payout%' OR title ILIKE '%withdraw%' OR title ILIKE '%payment%'
         ORDER BY created_at DESC LIMIT 1`
      );
      if (res.rows.length > 0 && res.rows[0].chat_id) {
        console.log(`📡 [Withdrawal Channel] Auto-detected from bot_chats: "${res.rows[0].title}" (${res.rows[0].chat_id})`);
        return res.rows[0].chat_id.toString().trim();
      }
    } catch (err: any) {
      console.warn('⚠️ [Withdrawal Channel] Auto-detection query failed:', err.message);
    }

    return '';
  }

  async function sendSafeTelegramMessage(
    telegram: any,
    targetChatId: string | number,
    htmlMessage: string,
    plainMessage: string,
    options?: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await telegram.sendMessage(targetChatId, htmlMessage, {
        parse_mode: 'HTML',
        ...options,
      });
      return { success: true };
    } catch (err: any) {
      console.warn(`[SafeMessage] HTML delivery to ${targetChatId} failed (${err.message}). Retrying with plain text...`);
      try {
        const cleanOptions = { ...options };
        delete cleanOptions.parse_mode;
        await telegram.sendMessage(targetChatId, plainMessage, cleanOptions);
        return { success: true };
      } catch (fallbackErr: any) {
        const errMsg = fallbackErr.message || err.message;
        console.error(`[SafeMessage] Delivery failure to ${targetChatId}:`, errMsg);
        return { success: false, error: errMsg };
      }
    }
  }

  b.action(/^wd_(approve|reject):(\d+)$/, async (ctx) => {
    const action = ctx.match[1];
    const withdrawalId = parseInt(ctx.match[2], 10);
    const adminName = ctx.from?.first_name || (ctx.from?.username ? `@${ctx.from.username}` : 'Admin');

    if (!ctx.from || !isAdmin(ctx.from.id)) {
      return ctx.answerCbQuery('⛔ Unauthorized action.', { show_alert: true });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const res = await client.query(
        `SELECT w.*, u.first_name, u.username 
         FROM withdrawals w
         JOIN users u ON w.user_id = u.id
         WHERE w.id = $1 FOR UPDATE`,
        [withdrawalId]
      );

      if (res.rows.length === 0) {
        await client.query('ROLLBACK');
        return ctx.answerCbQuery('Withdrawal record not found.', { show_alert: true });
      }

      const wd = res.rows[0];
      if (wd.status !== 'PENDING') {
        await client.query('ROLLBACK');
        return ctx.answerCbQuery(`Already processed: ${wd.status}`, { show_alert: true });
      }

      const resolvedTime = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

      if (action === 'approve') {
        try {
          await client.query(
            "UPDATE withdrawals SET status = 'APPROVED', reviewed_by = $1, updated_at = NOW() WHERE id = $2",
            [ctx.from.id, withdrawalId]
          );
        } catch (updateErr: any) {
          console.warn('Withdrawal update with updated_at failed, attempting fallback:', updateErr.message);
          await client.query(
            "UPDATE withdrawals SET status = 'APPROVED', reviewed_by = $1 WHERE id = $2",
            [ctx.from.id, withdrawalId]
          );
        }

        const safeFirstName = escapeHtml(wd.first_name || 'Miner');
        const safeAdminName = escapeHtml(adminName);
        const safeUsername = wd.username ? `(@${escapeHtml(wd.username)})` : '';
        const tonAmount = parseFloat(wd.ton_amount).toFixed(4);
        const walletAddress = wd.ton_address || '';
        const maskedAddr = maskAddress(walletAddress);
        const maskedUser = maskUserId(wd.user_id);

        // 1. Edit Admin Message in Admin Channel
        const adminCardHtml =
          `✅ <b>WITHDRAWAL APPROVED & PAID</b>\n\n` +
          `🆔 <b>User ID:</b> <code>${wd.user_id}</code>\n` +
          `👤 <b>User:</b> ${safeFirstName} ${safeUsername}\n` +
          `💰 <b>Amount:</b> <b>${tonAmount} TON</b>\n` +
          `🏦 <b>Wallet:</b> <code>${walletAddress}</code>\n` +
          `🕒 <b>Time:</b> <code>${resolvedTime}</code>\n` +
          `👮 <b>Approved By:</b> ${safeAdminName}`;

        const adminCardPlain =
          `✅ WITHDRAWAL APPROVED & PAID\n\n` +
          `User ID: ${wd.user_id}\n` +
          `User: ${wd.first_name} ${wd.username ? `(@${wd.username})` : ''}\n` +
          `Amount: ${tonAmount} TON\n` +
          `Wallet: ${walletAddress}\n` +
          `Time: ${resolvedTime}\n` +
          `Approved By: ${adminName}`;

        try {
          await ctx.editMessageText(adminCardHtml, { parse_mode: 'HTML' });
        } catch {
          await ctx.editMessageText(adminCardPlain).catch(() => {});
        }

        // 2. Private Message (DM to User)
        const userDmHtml =
          `🎉 <b>Withdrawal Processed!</b>\n\n` +
          `Your withdrawal request #${withdrawalId} of <b>${tonAmount} TON</b> has been approved and paid.\n\n` +
          `🏦 <b>Wallet:</b> <code>${walletAddress}</code>\n` +
          `🕒 <b>Time:</b> <code>${resolvedTime}</code>\n\n` +
          `⚡ <i>Check your wallet balance. Thanks for mining with NC TONs!</i>`;

        const userDmPlain =
          `🎉 Withdrawal Processed!\n\n` +
          `Your withdrawal request #${withdrawalId} of ${tonAmount} TON has been approved and paid.\n\n` +
          `Wallet: ${walletAddress}\n` +
          `Time: ${resolvedTime}\n\n` +
          `Check your wallet balance. Thanks for mining with NC TONs!`;

        const dmResult = await sendSafeTelegramMessage(
          ctx.telegram,
          wd.user_id.toString(),
          userDmHtml,
          userDmPlain
        );

        if (dmResult.success) {
          console.log(`✅ [Withdrawal Approval] DM successfully delivered to user ${wd.user_id}`);
        } else {
          console.warn(`⚠️ [Withdrawal Approval] DM delivery failed for user ${wd.user_id}: ${dmResult.error}`);
        }

        // 3. Post to Withdrawal Group / Channel
        let groupSent = false;
        let groupError = '';
        const targetGroupId = await resolveWithdrawalTargetChatId();

        if (targetGroupId) {
          const botUsername = ctx.botInfo?.username || b.botInfo?.username || (await getOrFetchBotUsername());

          const groupHtml =
            `💎 <b>NEW WITHDRAWAL SENT!</b>\n\n` +
            `💰 <b>Amount:</b> <b>${tonAmount} TON</b>\n` +
            `👤 <b>Miner:</b> <code>${maskedUser}</code> (${safeFirstName})\n` +
            `🏦 <b>Wallet:</b> <code>${maskedAddr}</code>\n` +
            `🕒 <b>Time:</b> <code>${resolvedTime}</code>\n` +
            `✅ <b>Status:</b> Confirmed & Paid\n\n` +
            (botUsername ? `🚀 <i>Mine real TON with @${botUsername}!</i>` : `🚀 <i>Mine real TON with NC TONs!</i>`);

          const groupPlain =
            `💎 NEW WITHDRAWAL SENT!\n\n` +
            `Amount: ${tonAmount} TON\n` +
            `Miner: ${maskedUser} (${wd.first_name || 'Miner'})\n` +
            `Wallet: ${maskedAddr}\n` +
            `Time: ${resolvedTime}\n` +
            `Status: Confirmed & Paid\n\n` +
            (botUsername ? `Mine real TON with @${botUsername}!` : `Mine real TON with NC TONs!`);

          // Safe inline buttons: only include valid URLs
          const buttons: any[] = [];
          if (botUsername && botUsername.trim().length > 0) {
            buttons.push({ text: '⛏️ Start Mining TON', url: `https://t.me/${botUsername.trim()}` });
          } else if (WEBAPP_URL && WEBAPP_URL.startsWith('http')) {
            buttons.push({ text: '⛏️ Launch NC TONs', url: WEBAPP_URL });
          }
          if (walletAddress && walletAddress.length > 10) {
            buttons.push({ text: '🔍 View on Tonviewer', url: `https://tonviewer.com/${walletAddress}` });
          }

          const groupOptions = buttons.length > 0 ? {
            reply_markup: {
              inline_keyboard: [buttons]
            }
          } : undefined;

          const groupResult = await sendSafeTelegramMessage(
            ctx.telegram,
            targetGroupId,
            groupHtml,
            groupPlain,
            groupOptions
          );

          if (groupResult.success) {
            groupSent = true;
            console.log(`✅ [Withdrawal Approval] Posted payout proof to group/channel ${targetGroupId}`);
          } else {
            groupError = groupResult.error || 'Delivery failed';
            console.error(`❌ [Withdrawal Approval] Failed to post to group ${targetGroupId}:`, groupError);
          }
        } else {
          console.warn('⚠️ [Withdrawal Approval] No withdrawal group or channel configured.');
        }

        await client.query('COMMIT');

        let alertMsg = '✅ Withdrawal approved and paid!';
        if (groupSent && dmResult.success) {
          alertMsg = '✅ Approved! Delivered to Withdrawal Group and user DM.';
        } else if (groupSent && !dmResult.success) {
          alertMsg = `✅ Approved & posted to Withdrawal Group!\n(User DM notice: ${dmResult.error?.includes('blocked') ? 'Bot blocked by user' : 'User hasn\'t started bot DM'})`;
        } else if (!groupSent && dmResult.success) {
          alertMsg = targetGroupId
            ? `✅ Approved & DM sent!\n(⚠️ Group post issue: ${groupError})`
            : '✅ Approved & DM sent!\n(⚠️ Note: Set WITHDRAWAL_GROUP_ID in .env/Render)';
        } else {
          alertMsg = `✅ Approved in DB!\n(⚠️ Group: ${groupError || 'Not configured'}, DM: ${dmResult.error || 'Chat not found'})`;
        }
        return ctx.answerCbQuery(alertMsg, { show_alert: true });
      }

      if (action === 'reject') {
        try {
          await client.query(
            "UPDATE withdrawals SET status = 'REJECTED', reviewed_by = $1, updated_at = NOW() WHERE id = $2",
            [ctx.from.id, withdrawalId]
          );
        } catch (updateErr: any) {
          console.warn('Withdrawal reject with updated_at failed, attempting fallback:', updateErr.message);
          await client.query(
            "UPDATE withdrawals SET status = 'REJECTED', reviewed_by = $1 WHERE id = $2",
            [ctx.from.id, withdrawalId]
          );
        }

        // Refund TON balance
        await client.query('UPDATE users SET ton_balance = ton_balance + $1 WHERE id = $2', [
          wd.ton_amount,
          wd.user_id,
        ]);

        const safeFirstName = escapeHtml(wd.first_name || 'Miner');
        const safeAdminName = escapeHtml(adminName);
        const safeUsername = wd.username ? `(@${escapeHtml(wd.username)})` : '';
        const tonAmount = parseFloat(wd.ton_amount).toFixed(4);
        const walletAddress = wd.ton_address || '';

        // Edit Private Admin Card
        const rejectAdminHtml =
          `❌ <b>WITHDRAWAL REJECTED & REFUNDED</b>\n\n` +
          `🆔 <b>User ID:</b> <code>${wd.user_id}</code>\n` +
          `👤 <b>User:</b> ${safeFirstName} ${safeUsername}\n` +
          `💰 <b>Refunded Amount:</b> <b>${tonAmount} TON</b>\n` +
          `🏦 <b>Wallet:</b> <code>${walletAddress}</code>\n` +
          `🕒 <b>Time:</b> <code>${resolvedTime}</code>\n` +
          `👮 <b>Rejected By:</b> ${safeAdminName}`;

        const rejectAdminPlain =
          `❌ WITHDRAWAL REJECTED & REFUNDED\n\n` +
          `User ID: ${wd.user_id}\n` +
          `User: ${wd.first_name}\n` +
          `Refunded Amount: ${tonAmount} TON\n` +
          `Wallet: ${walletAddress}\n` +
          `Time: ${resolvedTime}\n` +
          `Rejected By: ${adminName}`;

        try {
          await ctx.editMessageText(rejectAdminHtml, { parse_mode: 'HTML' });
        } catch {
          await ctx.editMessageText(rejectAdminPlain).catch(() => {});
        }

        // DM to User
        const rejectDmHtml =
          `⚠️ <b>Withdrawal Request Rejected</b>\n\n` +
          `Your withdrawal request #${withdrawalId} of <b>${tonAmount} TON</b> was rejected.\n\n` +
          `🔄 <b>Funds have been refunded to your in-game balance.</b> Please verify your wallet address and try again.`;

        const rejectDmPlain =
          `⚠️ Withdrawal Request Rejected\n\n` +
          `Your withdrawal request #${withdrawalId} of ${tonAmount} TON was rejected.\n\n` +
          `Funds have been refunded to your in-game balance. Please verify your wallet address and try again.`;

        const dmRejectResult = await sendSafeTelegramMessage(
          ctx.telegram,
          wd.user_id.toString(),
          rejectDmHtml,
          rejectDmPlain
        );

        await client.query('COMMIT');
        return ctx.answerCbQuery(
          dmRejectResult.success
            ? '❌ Withdrawal rejected, refunded, and user notified.'
            : '❌ Withdrawal rejected and refunded in database.',
          { show_alert: true }
        );
      }
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('Withdrawal callback error:', err);
      return ctx.answerCbQuery(`⚠️ Error: ${err?.message || 'Error processing request.'}`, { show_alert: true });
    } finally {
      client.release();
    }
  });

  // ============================================================================
  // 6. SOCIAL TASK SCREENSHOT VERIFICATION CALLBACKS
  // ============================================================================
  b.action(/^task_(appr|rej):(\d+)$/, async (ctx) => {
    const action = ctx.match[1];
    const submissionId = parseInt(ctx.match[2], 10);
    const adminName = ctx.from?.first_name || (ctx.from?.username ? `@${ctx.from.username}` : 'Admin');

    if (!ctx.from || !isAdmin(ctx.from.id)) {
      return ctx.answerCbQuery('⛔ Unauthorized action.', { show_alert: true });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const subRes = await client.query(
        `SELECT s.*, m.title, m.nc_reward, m.ton_reward 
         FROM task_proof_submissions s
         JOIN dynamic_missions m ON s.mission_id = m.id
         WHERE s.id = $1 FOR UPDATE`,
        [submissionId]
      );

      if (subRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return ctx.answerCbQuery('Submission not found.', { show_alert: true });
      }

      const sub = subRes.rows[0];
      if (sub.status !== 'PENDING_REVIEW') {
        await client.query('ROLLBACK');
        return ctx.answerCbQuery(`Already reviewed: ${sub.status}`, { show_alert: true });
      }

      const resolvedTime = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

      if (action === 'appr') {
        await client.query(
          "UPDATE task_proof_submissions SET status = 'APPROVED', reviewed_by = $1, updated_at = NOW() WHERE id = $2",
          [ctx.from.id, submissionId]
        );

        await client.query(
          'INSERT INTO user_mission_claims (user_id, mission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [sub.user_id, sub.mission_id]
        );

        await client.query(
          `UPDATE users 
           SET nc_balance = nc_balance + $1,
               ton_balance = ton_balance + $2
           WHERE id = $3`,
          [sub.nc_reward, sub.ton_reward, sub.user_id]
        );

        await client.query(
          'UPDATE dynamic_missions SET completed_count = completed_count + 1 WHERE id = $1',
          [sub.mission_id]
        );

        await ctx
          .editMessageCaption(
            `✅ <b>SOCIAL TASK PROOF APPROVED</b>\n\n` +
              `👤 <b>User ID:</b> <code>${sub.user_id}</code>\n` +
              `🎯 <b>Task:</b> ${sub.title}\n` +
              `💰 <b>Credited:</b> +${sub.nc_reward} NC | +${parseFloat(sub.ton_reward).toFixed(6)} TON\n` +
              `🕒 <b>Time:</b> <code>${resolvedTime}</code>\n` +
              `👮 <b>Approved By:</b> ${adminName}`,
            { parse_mode: 'HTML' }
          )
          .catch(() => {});

        await b.telegram
          .sendMessage(
            sub.user_id.toString(),
            `🎉 <b>Social Task Verified!</b>\n\n` +
              `Your proof for <b>${sub.title}</b> has been approved!\n` +
              `💰 Rewards Credited: <b>+${sub.nc_reward} NC Coins</b> and <b>+${parseFloat(sub.ton_reward).toFixed(6)} TON</b>!`,
            { parse_mode: 'HTML' }
          )
          .catch(() => {});

        await client.query('COMMIT');
        return ctx.answerCbQuery('Task proof approved and bounty awarded!');
      }

      if (action === 'rej') {
        await client.query(
          "UPDATE task_proof_submissions SET status = 'REJECTED', reviewed_by = $1, updated_at = NOW() WHERE id = $2",
          [ctx.from.id, submissionId]
        );

        await ctx
          .editMessageCaption(
            `❌ <b>SOCIAL TASK PROOF REJECTED</b>\n\n` +
              `👤 <b>User ID:</b> <code>${sub.user_id}</code>\n` +
              `🎯 <b>Task:</b> ${sub.title}\n` +
              `🕒 <b>Time:</b> <code>${resolvedTime}</code>\n` +
              `👮 <b>Rejected By:</b> ${adminName}\n` +
              `⚠️ <b>Reason:</b> Invalid or incomplete screenshot proof`,
            { parse_mode: 'HTML' }
          )
          .catch(() => {});

        await b.telegram
          .sendMessage(
            sub.user_id.toString(),
            `⚠️ <b>Task Proof Rejected</b>\n\n` +
              `Your screenshot proof for <b>${sub.title}</b> was rejected. Ensure your screenshot clearly shows that you followed or subscribed, then submit again.`,
            { parse_mode: 'HTML' }
          )
          .catch(() => {});

        await client.query('COMMIT');
        return ctx.answerCbQuery('Proof rejected.');
      }
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Proof action error:', err);
      return ctx.answerCbQuery('Failed to process action.', { show_alert: true });
    } finally {
      client.release();
    }
  });

  // ============================================================================
  // 7. ADMIN BROADCAST ENGINE (/broadcast & /stop_broadcast)
  // ============================================================================

  interface ActiveBroadcastSession {
    abort: boolean;
    adminId: number;
    adminName: string;
    total: number;
    delivered: number;
    blocked: number;
    failed: number;
    startTime: number;
    statusMsgId?: number;
    statusChatId?: number | string;
  }

  let activeBroadcast: ActiveBroadcastSession | null = null;

  async function safeBroadcastSendMessage(
    telegram: any,
    targetId: string,
    text: string
  ): Promise<void> {
    try {
      await telegram.sendMessage(targetId, text, { parse_mode: 'HTML' });
    } catch (err: any) {
      const isEntityError =
        err.response?.error_code === 400 &&
        (err.description?.toLowerCase().includes('entity') ||
          err.description?.toLowerCase().includes('parse') ||
          err.message?.toLowerCase().includes('entity') ||
          err.message?.toLowerCase().includes('parse'));
      if (isEntityError) {
        await telegram.sendMessage(targetId, text);
        return;
      }
      throw err;
    }
  }

  async function safeBroadcastCopyMessage(
    telegram: any,
    targetId: string,
    fromChatId: number | string,
    messageId: number,
    caption?: string
  ): Promise<void> {
    if (caption && caption.length > 0) {
      try {
        await telegram.copyMessage(targetId, fromChatId, messageId, {
          caption,
          parse_mode: 'HTML',
        });
      } catch (err: any) {
        const isEntityError =
          err.response?.error_code === 400 &&
          (err.description?.toLowerCase().includes('entity') ||
            err.description?.toLowerCase().includes('parse') ||
            err.message?.toLowerCase().includes('entity') ||
            err.message?.toLowerCase().includes('parse'));
        if (isEntityError) {
          await telegram.copyMessage(targetId, fromChatId, messageId, {
            caption,
          });
          return;
        }
        throw err;
      }
    } else {
      await telegram.copyMessage(targetId, fromChatId, messageId);
    }
  }

  const handleStopBroadcast = async (ctx: any) => {
    if (!ctx.from || !isAdmin(ctx.from.id)) {
      if (ctx.answerCbQuery) return ctx.answerCbQuery('⛔ Unauthorized action.', { show_alert: true });
      return ctx.reply('⛔ Unauthorized: Administrator permissions required.');
    }

    if (!activeBroadcast) {
      if (ctx.answerCbQuery) return ctx.answerCbQuery('ℹ️ No broadcast is currently active.', { show_alert: true });
      return ctx.reply('ℹ️ <b>No broadcast is currently running.</b>', { parse_mode: 'HTML' });
    }

    if (activeBroadcast.abort) {
      if (ctx.answerCbQuery) return ctx.answerCbQuery('🛑 Broadcast is already stopping...', { show_alert: true });
      return ctx.reply('⏳ <b>Broadcast stop in progress...</b> Final statistics will be posted momentarily.', {
        parse_mode: 'HTML',
      });
    }

    activeBroadcast.abort = true;

    if (ctx.answerCbQuery) {
      await ctx.answerCbQuery('🛑 Stopping broadcast...', { show_alert: true });
    }

    return ctx.reply(
      `🛑 <b>Broadcast Cancellation Triggered!</b>\n\n` +
        `Admin <b>${ctx.from.first_name || 'Admin'}</b> requested to halt the active broadcast.\n` +
        `Stopping remaining dispatches immediately...`,
      { parse_mode: 'HTML' }
    );
  };

  b.command(['stop_broadcast', 'stopbroadcast', 'cancel_broadcast', 'broadcast_stop'], handleStopBroadcast);
  b.action('admin_stop_broadcast', handleStopBroadcast);

  const executeBroadcast = async (ctx: any) => {
    if (!ctx.from || !isAdmin(ctx.from.id)) {
      return ctx.reply('⛔ Unauthorized: Admin access required.');
    }

    if (activeBroadcast) {
      const processed = activeBroadcast.delivered + activeBroadcast.blocked + activeBroadcast.failed;
      return ctx.reply(
        `⚠️ <b>A broadcast is already in progress!</b>\n\n` +
          `👤 <b>Started by:</b> ${activeBroadcast.adminName}\n` +
          `📊 <b>Progress:</b> ${processed} / ${activeBroadcast.total}\n` +
          `✅ <b>Delivered:</b> ${activeBroadcast.delivered}\n` +
          `🚫 <b>Blocked:</b> ${activeBroadcast.blocked}\n` +
          `⚠️ <b>Failed:</b> ${activeBroadcast.failed}\n\n` +
          `To cancel the current dispatch, send <code>/stop_broadcast</code> or tap below:`,
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🛑 Stop Current Broadcast', 'admin_stop_broadcast')],
          ]),
        }
      );
    }

    const message = ctx.message;
    const replyMessage = message && 'reply_to_message' in message ? message.reply_to_message : undefined;

    const textContent = message && 'text' in message ? message.text : '';
    const captionContent = message && 'caption' in message ? message.caption : '';
    const sourceString = textContent || captionContent || '';

    // Strip /broadcast or /broadcast@botname
    const rawText = sourceString.replace(/^\/broadcast(?:@\w+)?\s*/i, '').trim();

    // Check if current message is direct media with /broadcast caption
    const isDirectMedia =
      !replyMessage &&
      Boolean(
        captionContent &&
          ('photo' in message || 'video' in message || 'document' in message || 'animation' in message)
      );

    if (!replyMessage && !rawText && !isDirectMedia) {
      return ctx.reply(
        'ℹ️ <b>How to Broadcast:</b>\n\n' +
          '1. <b>Direct Text:</b> <code>/broadcast Your message text here</code>\n' +
          '2. <b>Rich Media:</b> Reply to any photo, video, or formatted card with <code>/broadcast [optional new caption]</code>\n' +
          '3. <b>Direct Photo/Video:</b> Send any photo or video with caption <code>/broadcast [your text]</code>\n' +
          '4. <b>Stop Broadcast:</b> Use <code>/stop_broadcast</code> or tap the Stop button to cancel an active broadcast at any time.',
        { parse_mode: 'HTML' }
      );
    }

    const statusMsg = await ctx.reply('⏳ <b>Fetching target lists from database...</b>', { parse_mode: 'HTML' });

    try {
      // 1. Fetch user IDs
      let userIds: string[] = [];
      try {
        const usersResult = await pool.query('SELECT id FROM users');
        userIds = usersResult.rows.map((r: any) => r.id.toString());
      } catch (uErr: any) {
        console.error('Error fetching users for broadcast:', uErr.message);
      }

      // 2. Fetch group/channel chat IDs safely
      let groupIds: string[] = [];
      try {
        const chatsResult = await pool.query('SELECT chat_id FROM bot_chats');
        groupIds = chatsResult.rows.map((r: any) => r.chat_id.toString());
      } catch (cErr: any) {
        console.warn('⚠️ Warning: bot_chats query failed or table not initialized, skipping groups:', cErr.message);
      }

      // 3. Clean and deduplicate target IDs
      const targets = Array.from(
        new Set([
          ...userIds,
          ...groupIds,
          ...(PUBLIC_PAYOUT_CHANNEL_ID ? [PUBLIC_PAYOUT_CHANNEL_ID] : []),
        ])
      ).filter((id) => id && id !== '0' && id !== 'undefined' && id !== 'null' && id.trim() !== '');

      const total = targets.length;

      if (total === 0) {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          statusMsg.message_id,
          undefined,
          '⚠️ <b>No targets found!</b>\n\nNo registered users or groups found in the database.',
          { parse_mode: 'HTML' }
        );
        return;
      }

      activeBroadcast = {
        abort: false,
        adminId: ctx.from.id,
        adminName: ctx.from.first_name || 'Admin',
        total,
        delivered: 0,
        blocked: 0,
        failed: 0,
        startTime: Date.now(),
        statusMsgId: statusMsg.message_id,
        statusChatId: ctx.chat.id,
      };

      await ctx.telegram.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        undefined,
        `🚀 <b>Broadcasting started...</b>\n\n` +
          `🎯 Total Targets: <b>${total}</b>\n` +
          `⚡ Dispatch rate: ~25 msgs/sec\n\n` +
          `<i>Tap below or send /stop_broadcast at any time to cancel.</i>`,
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🛑 Stop Broadcast', 'admin_stop_broadcast')],
          ]),
        }
      );

      let lastEditTime = Date.now();

      for (let i = 0; i < total; i++) {
        // Abort check
        if (activeBroadcast.abort) {
          console.log(`[Broadcast] Aborted by admin at target ${i + 1}/${total}`);
          break;
        }

        const targetId = targets[i];
        let retryCount = 0;
        let success = false;

        while (retryCount < 3 && !success && !activeBroadcast.abort) {
          try {
            if (isDirectMedia) {
              await safeBroadcastCopyMessage(
                ctx.telegram,
                targetId,
                ctx.chat.id,
                message.message_id,
                rawText || undefined
              );
            } else if (replyMessage) {
              await safeBroadcastCopyMessage(
                ctx.telegram,
                targetId,
                ctx.chat.id,
                replyMessage.message_id,
                rawText || undefined
              );
            } else {
              await safeBroadcastSendMessage(ctx.telegram, targetId, rawText);
            }
            activeBroadcast.delivered++;
            success = true;
          } catch (err: any) {
            const errCode = err.response?.error_code;
            if (errCode === 403) {
              // Blocked by user or kicked from chat
              activeBroadcast.blocked++;
              success = true;
            } else if (errCode === 429) {
              // Rate limited by Telegram
              retryCount++;
              if (retryCount >= 3) {
                activeBroadcast.failed++;
                success = true;
                break;
              }
              const waitSec = Math.min(err.response?.parameters?.retry_after || 3, 10);
              await sleep(waitSec * 1000);
            } else {
              // Other errors (e.g. 400 chat not found)
              activeBroadcast.failed++;
              success = true;
            }
          }
        }

        // Pacing delay to adhere to Telegram's 30 msgs/sec broadcast limit
        await sleep(40);

        // Update progress UI (throttled to avoid Telegram editMessageText rate limit)
        const isLast = i === total - 1;
        const now = Date.now();
        const timeSinceLastEdit = now - lastEditTime;

        if (isLast || activeBroadcast.abort || (i + 1) % 25 === 0 || timeSinceLastEdit > 3000) {
          lastEditTime = now;
          const processed = i + 1;
          const percent = Math.round((processed / total) * 100);
          await ctx.telegram
            .editMessageText(
              ctx.chat.id,
              statusMsg.message_id,
              undefined,
              `📡 <b>Broadcasting in progress...</b>\n\n` +
                `⏳ Progress: <b>${percent}%</b> (${processed}/${total})\n` +
                `✅ Delivered: <code>${activeBroadcast.delivered}</code>\n` +
                `🚫 Blocked: <code>${activeBroadcast.blocked}</code>\n` +
                `⚠️ Failed: <code>${activeBroadcast.failed}</code>\n\n` +
                `<i>Tap below or send /stop_broadcast to abort.</i>`,
              {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                  [Markup.button.callback('🛑 Stop Broadcast', 'admin_stop_broadcast')],
                ]),
              }
            )
            .catch(() => {});
        }
      }

      const duration = Math.round((Date.now() - activeBroadcast.startTime) / 1000);
      const wasAborted = activeBroadcast.abort;
      const totalProcessed = activeBroadcast.delivered + activeBroadcast.blocked + activeBroadcast.failed;

      if (wasAborted) {
        await ctx.telegram
          .editMessageText(
            ctx.chat.id,
            statusMsg.message_id,
            undefined,
            `🛑 <b>Broadcast Stopped by Admin!</b>\n\n` +
              `⏱️ <b>Duration:</b> ${duration}s\n` +
              `🎯 <b>Total Targets:</b> ${total}\n` +
              `📊 <b>Processed Before Stop:</b> ${totalProcessed}/${total}\n` +
              `✅ <b>Delivered:</b> ${activeBroadcast.delivered}\n` +
              `🚫 <b>Blocked / Left:</b> ${activeBroadcast.blocked}\n` +
              `❌ <b>Failed:</b> ${activeBroadcast.failed}`,
            { parse_mode: 'HTML' }
          )
          .catch(() => {});

        await ctx.reply(
          `🛑 <b>Broadcast successfully halted.</b> ${activeBroadcast.delivered} messages delivered before termination.`,
          { parse_mode: 'HTML' }
        );
      } else {
        await ctx.telegram
          .editMessageText(
            ctx.chat.id,
            statusMsg.message_id,
            undefined,
            `🎉 <b>Broadcast Complete!</b>\n\n` +
              `⏱️ <b>Duration:</b> ${duration}s\n` +
              `🎯 <b>Total Targets:</b> ${total}\n` +
              `✅ <b>Delivered:</b> ${activeBroadcast.delivered}\n` +
              `🚫 <b>Blocked:</b> ${activeBroadcast.blocked}\n` +
              `❌ <b>Failed:</b> ${activeBroadcast.failed}`,
            { parse_mode: 'HTML' }
          )
          .catch(() => {});
      }
    } catch (err: any) {
      console.error('Broadcast failed:', err);
      await ctx.reply(`❌ <b>Broadcast Error:</b> ${err?.message || 'Unknown error occurred'}`, {
        parse_mode: 'HTML',
      });
    } finally {
      activeBroadcast = null;
    }
  };

  b.command('broadcast', executeBroadcast);

  // Also support sending photo/video/media directly with caption starting with /broadcast
  b.on(['photo', 'video', 'document', 'animation'] as any, async (ctx: any, next: () => Promise<void>) => {
    const caption = ctx.message && 'caption' in ctx.message ? ctx.message.caption : '';
    if (caption && /^\/broadcast(@\w+)?(\s|$)/i.test(caption)) {
      return executeBroadcast(ctx);
    }
    return next();
  });

  // ============================================================================
  // 8. GROUP & CHANNEL AUTO-TRACKING MIDDLEWARE
  // ============================================================================
  b.on(
    ['new_chat_members', 'group_chat_created', 'supergroup_chat_created', 'channel_post'] as any,
    async (ctx: any, next: () => Promise<void>) => {
      if (ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup' || ctx.chat.type === 'channel')) {
        const title = 'title' in ctx.chat ? (ctx.chat as any).title : 'Untitled';
        await pool
          .query(
            `INSERT INTO bot_chats (chat_id, chat_type, title) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (chat_id) DO UPDATE SET title = EXCLUDED.title`,
            [ctx.chat.id, ctx.chat.type, title]
          )
          .catch(() => {});
      }
      return next();
    }
  );

  // ============================================================================
  // 9. TELEGRAM STARS (XTR) INVOICE HANDLERS
  // ============================================================================
  b.on('pre_checkout_query', async (ctx) => {
    await ctx.answerPreCheckoutQuery(true).catch(() => {});
  });

  b.on('successful_payment', async (ctx) => {
    const payment = ctx.message && 'successful_payment' in ctx.message ? ctx.message.successful_payment : undefined;
    const payload = payment?.invoice_payload; // e.g. "mission_create_<missionId>"
    if (payload && payload.startsWith('mission_create_')) {
      const missionId = parseInt(payload.replace('mission_create_', ''), 10);
      if (!isNaN(missionId)) {
        await pool
          .query("UPDATE dynamic_missions SET payment_status = 'ACTIVE', is_active = TRUE WHERE id = $1", [
            missionId,
          ])
          .catch((e) => console.error('Failed to activate mission:', e));
      }
    }
  });

  // ============================================================================
  // 10. GENERAL TEXT FALLBACK (Menu buttons guidance)
  // ============================================================================
  b.on('text', async (ctx, next) => {
    const text = ctx.message.text;
    if (text.startsWith('/')) {
      return next();
    }
    const from = ctx.from;
    const launchUrl = from ? `${WEBAPP_URL}?userId=${from.id}` : WEBAPP_URL;
    return ctx.reply(
      `👋 Hello <b>${from.first_name || 'Miner'}</b>!\nUse the menu buttons below or click Launch to open your mining rig:`,
      {
        parse_mode: 'HTML',
        ...getMainMenuKeyboard(launchUrl),
      }
    );
  });
}
