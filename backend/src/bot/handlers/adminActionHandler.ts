import { Telegraf } from 'telegraf';
import { prisma } from '../../db/db.js';
import { isAdmin } from '../../config/env.js';
import { editWithdrawalCard, notifyUserWithdrawalResult } from '../notifications.js';

export function registerAdminActionHandlers(bot: Telegraf) {
  bot.action(/^wd_(approve|reject):(\d+)$/, async (ctx) => {
    try {
      const action = ctx.match[1]; // 'approve' or 'reject'
      const withdrawalId = parseInt(ctx.match[2], 10);
      const reviewerId = ctx.from?.id;

      if (!reviewerId || !isAdmin(reviewerId)) {
        await ctx.answerCbQuery('⛔ Unauthorized: You do not have admin permissions.', { show_alert: true });
        return;
      }

      const withdrawal = await prisma.withdrawal.findUnique({
        where: { id: withdrawalId },
        include: { user: true },
      });

      if (!withdrawal) {
        await ctx.answerCbQuery('⚠️ Withdrawal record not found.', { show_alert: true });
        return;
      }

      if (withdrawal.status !== 'PENDING') {
        await ctx.answerCbQuery(`⚠️ Already processed as ${withdrawal.status}.`, { show_alert: true });
        return;
      }

      const reviewerName = ctx.from.username ? `@${ctx.from.username}` : (ctx.from.first_name || 'Admin');
      const tonAmountStr = withdrawal.ton_amount.toFixed(4);

      if (action === 'approve') {
        await prisma.withdrawal.update({
          where: { id: withdrawalId },
          data: {
            status: 'APPROVED',
            reviewed_by: BigInt(reviewerId),
          },
        });

        if (withdrawal.channel_message_id) {
          await editWithdrawalCard(
            withdrawal.channel_message_id,
            withdrawalId,
            'APPROVED',
            reviewerName,
            tonAmountStr,
            withdrawal.ton_address
          );
        }

        await notifyUserWithdrawalResult(withdrawal.user_id, withdrawalId, 'APPROVED', tonAmountStr);
        await ctx.answerCbQuery('✅ Payout approved successfully!');
      } else {
        // Reject: refund balance to user
        await prisma.$transaction([
          prisma.user.update({
            where: { id: withdrawal.user_id },
            data: {
              ton_balance: { increment: withdrawal.ton_amount },
            },
          }),
          prisma.withdrawal.update({
            where: { id: withdrawalId },
            data: {
              status: 'REJECTED',
              reviewed_by: BigInt(reviewerId),
            },
          }),
        ]);

        if (withdrawal.channel_message_id) {
          await editWithdrawalCard(
            withdrawal.channel_message_id,
            withdrawalId,
            'REJECTED',
            reviewerName,
            tonAmountStr,
            withdrawal.ton_address
          );
        }

        await notifyUserWithdrawalResult(withdrawal.user_id, withdrawalId, 'REJECTED', tonAmountStr);
        await ctx.answerCbQuery('❌ Payout rejected and refunded to user.');
      }
    } catch (err) {
      console.error('Error handling admin withdrawal action:', err);
      await ctx.answerCbQuery('❌ An error occurred while processing.', { show_alert: true });
    }
  });
}
