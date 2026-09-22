import { bot } from './telegrafInstance.js';
import { ENV } from '../config/env.js';

export async function sendWithdrawalApprovalCard(
  withdrawalId: number,
  userId: string | bigint,
  username: string | null | undefined,
  firstName: string,
  tonAddress: string,
  tonAmount: string
): Promise<bigint | null> {
  if (!bot || !ENV.ADMIN_CHANNEL_ID) {
    console.log(`[DEV/MOCK BOT] Withdrawal card #${withdrawalId} for ${tonAmount} TON to ${tonAddress} (Admin Channel not configured)`);
    return null;
  }

  const userHandle = username ? `@${username}` : firstName;
  const message =
    `🚨 <b>NEW WITHDRAWAL REQUEST #${withdrawalId}</b>\n\n` +
    `👤 <b>User:</b> ${firstName} (${userHandle})\n` +
    `🆔 <b>User ID:</b> <code>${userId.toString()}</code>\n` +
    `💎 <b>Amount:</b> <code>${tonAmount} TON</code>\n` +
    `📬 <b>Address:</b> <code>${tonAddress}</code>\n` +
    `⏰ <b>Requested At:</b> ${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC\n\n` +
    `Please review and approve or reject this payout:`;

  try {
    const sentMsg = await bot.telegram.sendMessage(ENV.ADMIN_CHANNEL_ID, message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Approve ✅', callback_data: `wd_approve:${withdrawalId}` },
            { text: 'Reject ❌', callback_data: `wd_reject:${withdrawalId}` },
          ],
        ],
      },
    });
    return BigInt(sentMsg.message_id);
  } catch (err) {
    console.error('Failed to send withdrawal approval card to Admin Channel:', err);
    return null;
  }
}

export async function editWithdrawalCard(
  channelMessageId: bigint,
  withdrawalId: number,
  status: 'APPROVED' | 'REJECTED',
  reviewedByName: string,
  tonAmount: string,
  tonAddress: string
) {
  if (!bot || !ENV.ADMIN_CHANNEL_ID) return;

  const statusEmoji = status === 'APPROVED' ? '✅' : '❌';
  const statusColor = status === 'APPROVED' ? 'APPROVED' : 'REJECTED & REFUNDED';

  const updatedMessage =
    `🚨 <b>WITHDRAWAL REQUEST #${withdrawalId} — ${statusColor} ${statusEmoji}</b>\n\n` +
    `💎 <b>Amount:</b> <code>${tonAmount} TON</code>\n` +
    `📬 <b>Address:</b> <code>${tonAddress}</code>\n` +
    `👮 <b>Reviewed By:</b> ${reviewedByName}\n` +
    `📅 <b>Resolved At:</b> ${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC`;

  try {
    await bot.telegram.editMessageText(
      ENV.ADMIN_CHANNEL_ID,
      Number(channelMessageId),
      undefined,
      updatedMessage,
      {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [] }, // Remove action buttons
      }
    );
  } catch (err) {
    console.error('Failed to edit withdrawal card in Admin Channel:', err);
  }
}

export async function notifyUserWithdrawalResult(
  userId: bigint | string,
  withdrawalId: number,
  status: 'APPROVED' | 'REJECTED',
  tonAmount: string
) {
  if (!bot) return;

  const text =
    status === 'APPROVED'
      ? `🎉 <b>Withdrawal Approved!</b>\n\nYour withdrawal request #${withdrawalId} of <code>${tonAmount} TON</code> has been approved and processed on the TON network.`
      : `⚠️ <b>Withdrawal Rejected & Refunded</b>\n\nYour withdrawal request #${withdrawalId} of <code>${tonAmount} TON</code> was rejected by the admin. The full amount has been refunded to your NC TONs mining balance.`;

  try {
    await bot.telegram.sendMessage(userId.toString(), text, { parse_mode: 'HTML' });
  } catch (err) {
    console.warn(`Could not send direct message to user ${userId.toString()}:`, (err as Error).message);
  }
}
