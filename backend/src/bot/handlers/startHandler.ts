import { Telegraf } from 'telegraf';
import { prisma } from '../../db/db.js';
import { ENV } from '../../config/env.js';
import { TON_EMOJI_TAG, NC_EMOJI_TAG } from '../notifications.js';

export function registerStartHandler(bot: Telegraf) {
  bot.start(async (ctx) => {
    try {
      const from = ctx.from;
      if (!from) return;

      const userId = BigInt(from.id);
      const firstName = from.first_name || 'Miner';
      const username = from.username || null;

      // Extract referral ID from deep link (e.g. /start ref_1234567)
      const startPayload = ctx.payload;
      let referrerId: bigint | null = null;
      if (startPayload && startPayload.startsWith('ref_')) {
        const refStr = startPayload.replace('ref_', '');
        if (/^\d+$/.test(refStr) && refStr !== from.id.toString()) {
          referrerId = BigInt(refStr);
        }
      }

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            id: userId,
            first_name: firstName,
            username: username,
            referrer_id: referrerId,
            ton_balance: 0,
            nc_balance: 100, // Welcome bonus NC coins
            power_percentage: 100,
            power_capacity_hours: 8,
            ton_hashrate_per_sec: 0.00000100,
          },
        });
      }

      const welcomeText =
        `⚡ <b>Welcome to NC TONs, ${firstName}!</b>\n\n` +
        `⛏️ <b>Dual-Currency Mining Rig:</b>\n` +
        `• Passively mine real ${TON_EMOJI_TAG} <b>TON Coin</b>!\n` +
        `• Earn ${NC_EMOJI_TAG} <b>NC Coins</b> to fuel your battery and power upgrades.\n` +
        `• Play the <b>Arcade Hub Mini-Games</b> (Memory Matrix, 2048 & Cyber Car Race) for instant token bounties.\n` +
        `• Complete community missions and withdraw TON directly to your wallet!\n\n` +
        `Tap the button below to launch the mining console:`;

      await ctx.reply(welcomeText, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🚀 Launch NC TONs Mining Rig',
                web_app: { url: ENV.WEBAPP_URL },
              },
            ],
            [
              {
                text: '📢 Official Channel',
                url: 'https://t.me/nctons_official',
              },
            ],
          ],
        },
      });
    } catch (err) {
      console.error('Error handling /start command:', err);
      await ctx.reply('Welcome to NC TONs! Tap below to start mining:', {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🚀 Launch Mining Rig',
                web_app: { url: ENV.WEBAPP_URL },
              },
            ],
          ],
        },
      });
    }
  });
}
