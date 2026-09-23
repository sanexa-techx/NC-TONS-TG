import { Telegraf, Markup } from 'telegraf';
import { pool } from '../db/index.js';
import { ENV, isAdmin, getAdminIds } from '../config/env.js';

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
 * Configure default bot menu commands for regular users and admins
 */
export async function setupBotCommands(b: Telegraf) {
  try {
    await b.telegram.setMyCommands([
      { command: 'start', description: '🚀 Launch NC TONs Mining Rig' },
      { command: 'stats', description: '📊 View personal mining balances & status' },
      { command: 'help', description: 'ℹ️ Mining guide, rules & reward rates' },
      { command: 'admin', description: '🛡️ Admin Command Center (Admins only)' },
      { command: 'broadcast', description: '📢 Global broadcast to all miners & chats' },
      { command: 'stats_global', description: '🌐 Global platform metrics (Admins only)' },
    ]);
    console.log('✅ Bot menu commands configured');
  } catch (err: any) {
    console.warn('Could not set bot commands:', err.message);
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
          const starterNc = isPremium ? 2000 : 1000;
          const bonusNc = isPremium ? 2500 : 1000;
          const bonusTon = isPremium ? 0.000200 : 0.000080;

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

        await client.query('COMMIT');
      } catch (dbErr) {
        await client.query('ROLLBACK');
        console.error('Bot /start registration error:', dbErr);
      } finally {
        client.release();
      }

      return ctx.reply(
        `⚡ <b>Welcome to NC TONs, ${firstName}!</b>\n\n` +
          `Mine real TON, play arcade games, and earn daily rewards directly inside Telegram.\n\n` +
          `🔋 <i>Keep your battery charged to maintain continuous mining!</i>`,
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [Markup.button.webApp('Launch NC TONs 🚀', WEBAPP_URL)],
            [Markup.button.url('Official Updates Channel 📢', 'https://t.me/nctons_official')],
          ]),
        }
      );
    } catch (err) {
      console.error('Error handling /start command:', err);
    }
  });

  // ============================================================================
  // 2. USER HELPER COMMANDS (/stats & /help)
  // ============================================================================
  b.command('stats', async (ctx) => {
    try {
      const from = ctx.from;
      if (!from) return;
      const res = await pool.query('SELECT * FROM users WHERE id = $1', [from.id]);
      if (res.rows.length === 0) {
        return ctx.reply('⚠️ No miner profile found. Press /start to begin mining!');
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
          ...Markup.inlineKeyboard([[Markup.button.webApp('Launch Mining Rig ⛏️', WEBAPP_URL)]]),
        }
      );
    } catch (err) {
      return ctx.reply('❌ Error fetching your stats.');
    }
  });

  b.command('help', async (ctx) => {
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
        ...Markup.inlineKeyboard([[Markup.button.webApp('Open NC TONs 🚀', WEBAPP_URL)]]),
      }
    );
  });

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
        `• <code>/broadcast &lt;text&gt;</code>: Dispatch announcement to all miners and channels\n` +
        `• <i>Reply to any photo/video with</i> <code>/broadcast</code>: Rich media replication\n` +
        `• <code>/stats_global</code>: Live platform economics & miner telemetry\n` +
        `• Review incoming payouts & social proofs directly in the Admin Channel`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.webApp('Open WebApp Admin Panel ⚡', `${WEBAPP_URL}?userId=${ctx.from.id}`)],
          [Markup.button.callback('📊 Global Telemetry', 'admin_cmd:stats_global')],
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

      const message =
        `🌐 <b>NC TONs — Global Platform Telemetry</b>\n\n` +
        `👥 <b>Total Miners:</b> <code>${totalUsers}</code>\n` +
        `📢 <b>Tracked Channels/Groups:</b> <code>${trackedChats}</code>\n` +
        `💎 <b>Total User TON:</b> <code>${totalTon} TON</code>\n` +
        `🪙 <b>Total User NC:</b> <code>${totalNc} NC</code>\n\n` +
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

  // ============================================================================
  // 5. WITHDRAWAL APPROVAL & REJECTION CALLBACKS
  // ============================================================================
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
        await client.query(
          "UPDATE withdrawals SET status = 'APPROVED', reviewed_by = $1, updated_at = NOW() WHERE id = $2",
          [ctx.from.id, withdrawalId]
        );

        // Edit Private Admin Card
        await ctx
          .editMessageText(
            `✅ <b>WITHDRAWAL APPROVED & PAID</b>\n\n` +
              `🆔 <b>User ID:</b> <code>${wd.user_id}</code>\n` +
              `👤 <b>User:</b> ${wd.first_name} ${wd.username ? `(@${wd.username})` : ''}\n` +
              `💰 <b>Amount:</b> <b>${parseFloat(wd.ton_amount).toFixed(4)} TON</b>\n` +
              `🏦 <b>Wallet:</b> <code>${wd.ton_address}</code>\n` +
              `🕒 <b>Time:</b> <code>${resolvedTime}</code>\n` +
              `👮 <b>Approved By:</b> ${adminName}`,
            { parse_mode: 'HTML' }
          )
          .catch(() => {});

        // DM to User
        await b.telegram
          .sendMessage(
            wd.user_id.toString(),
            `🎉 <b>Withdrawal Processed!</b>\n\n` +
              `Your withdrawal of <b>${parseFloat(wd.ton_amount).toFixed(4)} TON</b> has been approved and paid.\n\n` +
              `🏦 <b>Wallet:</b> <code>${wd.ton_address}</code>\n` +
              `🕒 <b>Time:</b> <code>${resolvedTime}</code>\n\n` +
              `⚡ <i>Check your wallet balance. Thanks for mining with NC TONs!</i>`,
            { parse_mode: 'HTML' }
          )
          .catch(() => {});

        // Public Proof Broadcast
        if (PUBLIC_PAYOUT_CHANNEL_ID) {
          const botUsername = ctx.botInfo?.username || 'NCTons_Bot';
          await b.telegram
            .sendMessage(
              PUBLIC_PAYOUT_CHANNEL_ID,
              `💎 <b>NEW WITHDRAWAL SENT!</b>\n\n` +
                `💰 <b>Amount:</b> <b>${parseFloat(wd.ton_amount).toFixed(4)} TON</b>\n` +
                `👤 <b>Miner:</b> <code>${maskUserId(wd.user_id)}</code> (${wd.first_name})\n` +
                `🏦 <b>Wallet:</b> <code>${maskAddress(wd.ton_address)}</code>\n` +
                `🕒 <b>Time:</b> <code>${resolvedTime}</code>\n` +
                `✅ <b>Status:</b> Confirmed & Paid\n\n` +
                `🚀 <i>Mine real TON with @${botUsername}!</i>`,
              { parse_mode: 'HTML' }
            )
            .catch((err) => console.error('Public proof failed:', err.message));
        }

        await client.query('COMMIT');
        return ctx.answerCbQuery('Withdrawal approved & posted to Public Proofs.');
      }

      if (action === 'reject') {
        await client.query(
          "UPDATE withdrawals SET status = 'REJECTED', reviewed_by = $1, updated_at = NOW() WHERE id = $2",
          [ctx.from.id, withdrawalId]
        );

        // Refund TON balance
        await client.query('UPDATE users SET ton_balance = ton_balance + $1 WHERE id = $2', [
          wd.ton_amount,
          wd.user_id,
        ]);

        // Edit Private Admin Card
        await ctx
          .editMessageText(
            `❌ <b>WITHDRAWAL REJECTED & REFUNDED</b>\n\n` +
              `🆔 <b>User ID:</b> <code>${wd.user_id}</code>\n` +
              `👤 <b>User:</b> ${wd.first_name} ${wd.username ? `(@${wd.username})` : ''}\n` +
              `💰 <b>Refunded Amount:</b> <b>${parseFloat(wd.ton_amount).toFixed(4)} TON</b>\n` +
              `🏦 <b>Wallet:</b> <code>${wd.ton_address}</code>\n` +
              `🕒 <b>Time:</b> <code>${resolvedTime}</code>\n` +
              `👮 <b>Rejected By:</b> ${adminName}`,
            { parse_mode: 'HTML' }
          )
          .catch(() => {});

        // DM to User
        await b.telegram
          .sendMessage(
            wd.user_id.toString(),
            `⚠️ <b>Withdrawal Request Rejected</b>\n\n` +
              `Your withdrawal of <b>${parseFloat(wd.ton_amount).toFixed(4)} TON</b> was rejected.\n` +
              `🔄 <b>Funds have been refunded to your in-game balance.</b> Please verify your wallet address and try again.`,
            { parse_mode: 'HTML' }
          )
          .catch(() => {});

        await client.query('COMMIT');
        return ctx.answerCbQuery('Withdrawal rejected and balance refunded.');
      }
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Withdrawal callback error:', err);
      return ctx.answerCbQuery('Error processing request.', { show_alert: true });
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
  // 7. ADMIN BROADCAST ENGINE (/broadcast)
  // ============================================================================
  b.command('broadcast', async (ctx) => {
    if (!ctx.from || !isAdmin(ctx.from.id)) {
      return ctx.reply('⛔ Unauthorized: Admin access required.');
    }

    const replyMessage = ctx.message && 'reply_to_message' in ctx.message ? ctx.message.reply_to_message : undefined;
    const rawText = ctx.message && 'text' in ctx.message ? ctx.message.text.replace('/broadcast', '').trim() : '';

    if (!replyMessage && !rawText) {
      return ctx.reply(
        'ℹ️ <b>How to Broadcast:</b>\n\n' +
          '1. <b>Direct Text:</b> <code>/broadcast Your message text here</code>\n' +
          '2. <b>Rich Media:</b> Reply to any photo, video, or formatted card with <code>/broadcast</code>',
        { parse_mode: 'HTML' }
      );
    }

    const statusMsg = await ctx.reply('⏳ Fetching target lists from database...');

    try {
      const usersResult = await pool.query('SELECT id FROM users');
      const userIds: string[] = usersResult.rows.map((r: any) => r.id.toString());

      const chatsResult = await pool.query('SELECT chat_id FROM bot_chats');
      const groupIds: string[] = chatsResult.rows.map((r: any) => r.chat_id.toString());

      const targets = Array.from(
        new Set([
          ...userIds,
          ...groupIds,
          ...(PUBLIC_PAYOUT_CHANNEL_ID ? [PUBLIC_PAYOUT_CHANNEL_ID] : []),
        ])
      );

      const total = targets.length;
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        undefined,
        `🚀 <b>Broadcasting started...</b>\nTotal Targets: <b>${total}</b>`,
        { parse_mode: 'HTML' }
      );

      let delivered = 0;
      let blocked = 0;
      let failed = 0;
      const startTime = Date.now();

      for (let i = 0; i < total; i++) {
        const targetId = targets[i];

        try {
          if (replyMessage) {
            await ctx.telegram.copyMessage(targetId, ctx.chat.id, replyMessage.message_id);
          } else {
            await ctx.telegram.sendMessage(targetId, rawText, { parse_mode: 'HTML' });
          }
          delivered++;
        } catch (err: any) {
          if (err.response?.error_code === 403) {
            blocked++;
          } else if (err.response?.error_code === 429) {
            const waitSec = err.response?.parameters?.retry_after || 5;
            await sleep(waitSec * 1000);
            i--;
            continue;
          } else {
            failed++;
          }
        }

        await sleep(35); // 35ms pacing ~ 28 msgs/sec

        if ((i + 1) % 100 === 0 || i === total - 1) {
          const percent = Math.round(((i + 1) / total) * 100);
          await ctx.telegram
            .editMessageText(
              ctx.chat.id,
              statusMsg.message_id,
              undefined,
              `📡 <b>Broadcasting in progress...</b>\n` +
                `Progress: <b>${percent}%</b> (${i + 1}/${total})\n` +
                `✅ Delivered: <code>${delivered}</code>\n` +
                `🚫 Blocked: <code>${blocked}</code>\n` +
                `⚠️ Failed: <code>${failed}</code>`,
              { parse_mode: 'HTML' }
            )
            .catch(() => {});
        }
      }

      const duration = Math.round((Date.now() - startTime) / 1000);
      await ctx.telegram.sendMessage(
        ctx.chat.id,
        `🎉 <b>Broadcast Complete!</b>\n\n` +
          `⏱️ <b>Time:</b> ${duration}s\n` +
          `🎯 <b>Total Targets:</b> ${total}\n` +
          `✅ <b>Delivered:</b> ${delivered}\n` +
          `🚫 <b>Blocked:</b> ${blocked}\n` +
          `❌ <b>Failed:</b> ${failed}`,
        { parse_mode: 'HTML' }
      );
    } catch (err) {
      console.error('Broadcast failed:', err);
      await ctx.reply('❌ Error occurred during broadcast.');
    }
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
}
