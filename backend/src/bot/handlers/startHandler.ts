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
      const isPremium = Boolean((from as any).is_premium);

      // Extract referral ID from deep link (e.g. /start ref_123456789)
      const rawText = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
      const textPayload = rawText.split(' ')[1];
      const startPayload = ctx.payload || textPayload;

      let referrerId: bigint | null = null;
      if (startPayload && startPayload.startsWith('ref_')) {
        const refStr = startPayload.replace('ref_', '').trim();
        if (/^\d+$/.test(refStr) && refStr !== from.id.toString()) {
          referrerId = BigInt(refStr);
        }
      }

      // Check if user already exists
      let user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        // 2. Determine referral bonus rates (Higher for TG Premium)
        const bonusNc = isPremium ? 2500 : 1000;
        const bonusTon = isPremium ? 0.000200 : 0.000080;

        // Starter welcome gift for the new user
        const starterNc = isPremium ? 2000 : 1000;

        user = await (prisma.user as any).create({
          data: {
            id: userId,
            first_name: firstName,
            username: username,
            referred_by: referrerId,
            ton_balance: 0,
            nc_balance: BigInt(starterNc),
            power_percentage: 100,
            power_capacity_hours: 8,
            ton_hashrate_per_sec: 0.00000100,
          },
        });

        // 3. If valid referrer, credit their pending stash & log referral entry
        if (referrerId) {
          try {
            const referrerExists = await prisma.user.findUnique({
              where: { id: referrerId },
            });

            if (referrerExists) {
              await (prisma as any).referral.create({
                data: {
                  referrer_id: referrerId,
                  referee_id: userId,
                  is_premium: isPremium,
                  bonus_nc: bonusNc,
                  bonus_ton: bonusTon,
                },
              });

              await (prisma.user as any).update({
                where: { id: referrerId },
                data: {
                  referral_count: { increment: 1 },
                  unclaimed_referral_nc: { increment: BigInt(bonusNc) },
                  unclaimed_referral_ton: { increment: bonusTon },
                  total_referral_nc: { increment: BigInt(bonusNc) },
                  total_referral_ton: { increment: bonusTon },
                },
              });

              // Notify referrer via bot DM
              await bot.telegram
                .sendMessage(
                  referrerId.toString(),
                  `👥 <b>New Friend Joined!</b>\n\n` +
                    `Your friend <b>${firstName}</b> just joined NC TONs.\n` +
                    `🎁 Bonus pending: <b>+${bonusNc.toLocaleString()} NC</b> and <b>+${bonusTon.toFixed(6)} TON</b>!`,
                  { parse_mode: 'HTML' }
                )
                .catch(() => {}); // Prevent crash if user blocked bot
            }
          } catch (refErr) {
            console.warn('Could not record referral bonus:', refErr);
          }
        }
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
