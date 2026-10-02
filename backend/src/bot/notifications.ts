import { bot } from './telegrafInstance.js';
import { ENV } from '../config/env.js';

// Standard Telegram-compatible emoji icons
export const TON_EMOJI_TAG = '💎';
export const NC_EMOJI_TAG = '🪙';

export async function sendWithdrawalApprovalCard(
  withdrawalId: number,
  userId: string | bigint,
  username: string | null | undefined,
  firstName: string,
  tonAddress: string,
  tonAmount: string,
  riskScore: number = 0
): Promise<bigint | null> {
  if (!bot || !ENV.ADMIN_CHANNEL_ID) {
    console.log(`[DEV/MOCK BOT] Withdrawal card #${withdrawalId} for ${tonAmount} TON to ${tonAddress} (Admin Channel not configured)`);
    return null;
  }

  const isHighRisk = riskScore >= 50;
  const parsedAmount = parseFloat(tonAmount) || 0;
  const requestTime = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  const nameDisplay = `${firstName} ${username ? `(@${username})` : ''}`.trim();

  const message =
    `${isHighRisk ? '🚨 <b>SUSPICIOUS WITHDRAWAL DETECTED!</b> 🚨' : '💎 <b>NEW WITHDRAWAL REQUEST</b>'}\n\n` +
    `🆔 <b>User ID:</b> <code>${userId.toString()}</code>\n` +
    `👤 <b>Name:</b> ${nameDisplay}\n` +
    `⚠️ <b>Risk Score:</b> <b>${riskScore}/100</b> ${isHighRisk ? '🔴 (High Risk / Multi-Account)' : '🟢 (Clean)'}\n` +
    `💰 <b>Amount:</b> <b>${parsedAmount.toFixed(4)} TON</b>\n` +
    `🏦 <b>Wallet Address:</b>\n<code>${tonAddress}</code>\n` +
    `🕒 <b>Time:</b> <code>${requestTime}</code>\n` +
    `${isHighRisk ? '⚠️ <b>Warning:</b> Review device clashing or emulator logs before approving!\n' : ''}` +
    `⚙️ <b>Status:</b> ⏳ Pending Review`;

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
    `<b>🚨 Withdrawal Request #${withdrawalId} — ${statusColor} ${statusEmoji}</b>\n\n` +
    `💰 <b>Amount:</b> ${TON_EMOJI_TAG} <b>${tonAmount} TON</b>\n` +
    `🏦 <b>Wallet:</b> <code>${tonAddress}</code>\n` +
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
      ? `🎉 <b>Withdrawal Approved!</b>\n\nYour withdrawal request #${withdrawalId} of ${TON_EMOJI_TAG} <b>${tonAmount} TON</b> has been approved and processed on the TON network.`
      : `⚠️ <b>Withdrawal Rejected & Refunded</b>\n\nYour withdrawal request #${withdrawalId} of ${TON_EMOJI_TAG} <b>${tonAmount} TON</b> was rejected by the admin. The full amount has been refunded to your NC TONs mining balance.`;

  try {
    await bot.telegram.sendMessage(userId.toString(), text, { parse_mode: 'HTML' });
  } catch (err) {
    console.warn(`Could not send direct message to user ${userId.toString()}:`, (err as Error).message);
  }
}

export async function notifyUserRewardCredited(
  userId: bigint | string,
  ncReward: number,
  tonReward: string | number,
  sourceTitle: string = 'Challenge'
) {
  if (!bot) return;

  const rewardMessage =
    `🎉 <b>Reward Credited! (${sourceTitle})</b>\n\n` +
    `${NC_EMOJI_TAG} <b>+${ncReward} NC Coins</b> (Power Supply Fuel)\n` +
    `${TON_EMOJI_TAG} <b>+${tonReward} TON</b>\n\n` +
    `Your mining rig telemetry and balances have been updated.`;

  try {
    await bot.telegram.sendMessage(userId.toString(), rewardMessage, { parse_mode: 'HTML' });
  } catch (err) {
    console.warn(`Could not send reward notification to ${userId.toString()}:`, (err as Error).message);
  }
}

export async function notifyUserMiningPeriodEnded(
  userId: bigint | string,
  firstName: string,
  tonAccrued?: string,
  currentTonBalance?: string
): Promise<boolean> {
  if (!bot) {
    console.log(`[DEV/MOCK BOT] Mining period reminder for user ${userId.toString()} (${firstName})`);
    return false;
  }

  const WEBAPP_URL = process.env.WEBAPP_URL || ENV.WEBAPP_URL;
  const launchUrl = `${WEBAPP_URL}?userId=${userId.toString()}`;

  let message =
    `🔋 <b>Mining Period Ended!</b> ⚠️\n\n` +
    `Hello <b>${firstName}</b>, your NC TONs mining rig has exhausted its power battery and mining has stopped.\n\n`;

  if (tonAccrued && parseFloat(tonAccrued) > 0) {
    message += `💰 <b>Session Minted:</b> ${TON_EMOJI_TAG} <b>+${parseFloat(tonAccrued).toFixed(6)} TON</b>\n`;
  }
  if (currentTonBalance) {
    message += `💎 <b>Total TON Balance:</b> <b>${parseFloat(currentTonBalance).toFixed(6)} TON</b>\n`;
  }

  message +=
    `\n⚡ <i>Don't leave your rig idle!</i>\n` +
    `Recharge your power grid back to 100% using NC Coins or a quick sponsored video to continue accumulating TON!`;

  const inlineKeyboard = [];
  if (launchUrl && launchUrl.startsWith('https://')) {
    inlineKeyboard.push([{ text: '⚡ Recharge Power & Resume Mining 🚀', web_app: { url: launchUrl } }]);
  } else if (launchUrl && launchUrl.startsWith('http')) {
    inlineKeyboard.push([{ text: '⚡ Recharge Power & Resume Mining 🚀', url: launchUrl }]);
  }

  try {
    await bot.telegram.sendMessage(userId.toString(), message, {
      parse_mode: 'HTML',
      reply_markup: inlineKeyboard.length > 0 ? { inline_keyboard: inlineKeyboard } : undefined,
    });
    return true;
  } catch (err: any) {
    const errMsg = err?.message || '';
    if (err?.response?.error_code === 403 || errMsg.includes('blocked')) {
      console.warn(`[Mining Reminder] User ${userId.toString()} has blocked the bot or chat is unavailable.`);
    } else {
      console.warn(`[Mining Reminder] Could not send reminder to ${userId.toString()}:`, errMsg);
    }
    return false;
  }
}
