// backend/src/services/adminAlert.ts
import { Markup } from "telegraf";
import { bot } from "../bot/bot.js";
import { pool } from "../db/index.js";
import { ENV } from "../config/env.js";

const ADMIN_CHANNEL_ID = process.env.ADMIN_CHANNEL_ID || ENV.ADMIN_CHANNEL_ID || "";

export async function sendAdminWithdrawalCard(withdrawalId: number) {
  const query = `
    SELECT 
      w.id as withdrawal_id, w.ton_amount, w.ton_address, w.created_at,
      u.id as user_id, u.first_name, u.username, u.risk_score, u.primary_device_hash, u.last_ip_address,
      (SELECT COUNT(DISTINCT user_id)::INT FROM user_devices WHERE device_hash = u.primary_device_hash) as device_clash_count,
      (SELECT ARRAY_AGG(DISTINCT user_id) FROM user_devices WHERE device_hash = u.primary_device_hash AND user_id != u.id) as linked_user_ids
    FROM withdrawals w
    JOIN users u ON w.user_id = u.id
    WHERE w.id = $1
  `;

  const res = await pool.query(query, [withdrawalId]);
  if (res.rows.length === 0) return;
  const data = res.rows[0];

  const clashCount = data.device_clash_count || 1;
  const isMultiAccount = clashCount > 1;
  const isHighRisk = data.risk_score >= 50 || isMultiAccount;

  let detectionReport = "";
  if (isMultiAccount) {
    const otherAccounts = (data.linked_user_ids || []).slice(0, 5).join(", ");
    detectionReport += `\n🚨 <b>CLONED DEVICE DETECTED:</b> <b>${clashCount} accounts</b> share this hardware!`;
    detectionReport += `\n🔗 <b>Linked IDs:</b> <code>${otherAccounts || "None"}</code>`;
  } else {
    detectionReport += `\n✅ <b>Device Integrity:</b> 1 unique account registered on hardware.`;
  }

  const cardHtml =
    `${isHighRisk ? "⚠️ <b>SUSPICIOUS WITHDRAWAL DETECTED</b> ⚠️" : "💎 <b>NEW WITHDRAWAL REQUEST</b>"}\n\n` +
    `🆔 <b>User ID:</b> <code>${data.user_id}</code>\n` +
    `👤 <b>Name:</b> ${data.first_name} ${data.username ? `(@${data.username})` : ""}\n` +
    `💰 <b>Amount:</b> <b>${parseFloat(data.ton_amount).toFixed(4)} TON</b>\n` +
    `🏦 <b>Wallet:</b> <code>${data.ton_address}</code>\n` +
    `🕒 <b>Time:</b> <code>${new Date(data.created_at).toISOString().replace("T", " ").slice(0, 19)} UTC</code>\n\n` +
    `🛡️ <b>SECURITY DIAGNOSTICS:</b>\n` +
    `• <b>Risk Score:</b> <b>${data.risk_score}/100</b> ${data.risk_score >= 50 ? "🔴 (High Risk)" : "🟢 (Clean)"}\n` +
    `• <b>Device Hash:</b> <code>${(data.primary_device_hash || "Not Tracked").slice(0, 16)}...</code>\n` +
    `• <b>IP Address:</b> <code>${data.last_ip_address || "Unknown"}</code>` +
    `${detectionReport}\n\n` +
    `⚙️ <b>Status:</b> ⏳ Pending Review`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback("Approve & Mark Paid ✅", `wd_approve:${data.withdrawal_id}`)],
    [
      Markup.button.callback("Reject with Reason ⚠️", `wd_menu_reject:${data.withdrawal_id}`),
      Markup.button.callback("🚨 Ban & Confiscate", `wd_menu_ban:${data.withdrawal_id}`),
    ],
  ]);

  if (!bot || !ADMIN_CHANNEL_ID) {
    console.log(`[Admin Alert] Bot or ADMIN_CHANNEL_ID not configured, skipped posting card for withdrawal #${withdrawalId}`);
    return;
  }

  try {
    const post = await bot.telegram.sendMessage(ADMIN_CHANNEL_ID, cardHtml, {
      parse_mode: "HTML",
      ...keyboard,
    });

    await pool.query("UPDATE withdrawals SET channel_message_id = $1 WHERE id = $2", [
      post.message_id,
      data.withdrawal_id,
    ]);
  } catch (err: any) {
    console.error(`[Admin Alert] Failed to post withdrawal card #${withdrawalId}:`, err.message);
  }
}
