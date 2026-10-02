// backend/src/middleware/antiFraud.ts
import { Request, Response, NextFunction } from "express";
import { pool } from "../db/db.js";
import { bot } from "../bot/bot.js";
import { ENV } from "../config/env.js";

const ADMIN_CHANNEL_ID = ENV.ADMIN_CHANNEL_ID;

export async function antiFraudCheck(req: Request, res: Response, next: NextFunction) {
  let rawUserId =
    req.body?.userId ||
    req.query?.userId ||
    req.telegramUser?.id ||
    req.headers["x-telegram-user-id"] ||
    req.headers["x-dev-telegram-id"];

  if (!rawUserId) {
    const authHeader = req.headers.authorization;
    let initData = '';
    if (authHeader && authHeader.startsWith('tma ')) {
      initData = authHeader.substring(4);
    } else if (req.body && req.body.initData) {
      initData = req.body.initData;
    }
    if (initData) {
      try {
        const urlParams = new URLSearchParams(initData);
        const userStr = urlParams.get('user');
        if (userStr) {
          const parsed = JSON.parse(userStr);
          if (parsed && parsed.id) {
            rawUserId = parsed.id;
          }
        }
      } catch {}
    }
  }

  const deviceHash = req.headers["x-device-hash"] as string;
  const isAutomationHeader = req.headers["x-is-automation"] === "true";
  const webglRenderer = (req.headers["x-webgl-renderer"] as string) || "Unknown";
  const canvasHash = (req.headers["x-canvas-hash"] as string) || "Unknown";

  const rawIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "0.0.0.0";
  const ipAddress = rawIp.split(",")[0].trim();

  if (!rawUserId) return next();
  const userId = rawUserId.toString();

  const client = await pool.connect();
  try {
    // 1. Check if user is already banned
    const userRes = await client.query(
      "SELECT is_banned, ban_reason, risk_score, referred_by FROM users WHERE id = $1",
      [userId]
    );

    if (userRes.rows.length === 0) {
      client.release();
      return next();
    }

    const user = userRes.rows[0];
    if (user.is_banned) {
      client.release();
      return res.status(403).json({
        error: "Account Suspended",
        reason: user.ban_reason || "Violation of Fair-Play Security Policy",
      });
    }

    let calculatedRisk = 0;

    // 2. Evaluate Automation / Bot Traits
    if (isAutomationHeader) {
      calculatedRisk += 60;
      await logSecurityEvent(client, userId, "AUTOMATION_FLAG", "CRITICAL", { ipAddress });
    }

    // 3. Device Cluster Evaluation (Multi-Accounting on same device)
    if (deviceHash) {
      // Upsert device footprint
      await client.query(
        `INSERT INTO user_devices (user_id, device_hash, canvas_hash, webgl_renderer, user_agent, ip_address, is_emulator, last_seen)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (user_id, device_hash) 
         DO UPDATE SET last_seen = NOW(), ip_address = $6`,
        [
          userId,
          deviceHash,
          canvasHash,
          webglRenderer,
          req.headers["user-agent"] || "",
          ipAddress,
          isAutomationHeader,
        ]
      );

      // Check how many different users share this exact device
      const clusterRes = await client.query(
        "SELECT COUNT(DISTINCT user_id)::INT as count FROM user_devices WHERE device_hash = $1",
        [deviceHash]
      );
      const accountsOnDevice = Number(clusterRes.rows[0]?.count || 0);

      if (accountsOnDevice > 1) {
        calculatedRisk += (accountsOnDevice - 1) * 25; // +25 per duplicate account
      }

      // 4. Referral Self-Farming Check
      if (user.referred_by) {
        const referrerDevice = await client.query(
          "SELECT device_hash, ip_address FROM user_devices WHERE user_id = $1",
          [user.referred_by.toString()]
        );

        const match = referrerDevice.rows.some(
          (r: any) => r.device_hash === deviceHash || (r.ip_address && r.ip_address === ipAddress)
        );

        if (match) {
          calculatedRisk += 50;
          await logSecurityEvent(client, userId, "REFERRAL_SELF_FARM", "HIGH", {
            referrerId: user.referred_by.toString(),
            clashDevice: deviceHash,
            clashIp: ipAddress,
          });
        }
      }

      // Hard Ban condition: 4+ accounts on 1 device hash
      if (accountsOnDevice >= 4) {
        await client.query(
          "UPDATE users SET is_banned = TRUE, ban_reason = 'Sybil Botnet: 4+ accounts clustered on 1 physical device', risk_score = 100 WHERE id = $1",
          [userId]
        );

        // Send alert card to Admin Channel
        if (bot?.telegram && ADMIN_CHANNEL_ID) {
          bot.telegram
            .sendMessage(
              ADMIN_CHANNEL_ID,
              `🚨 <b>AUTOMATED BOT BAN EXECUTED</b>\n\n` +
                `👤 <b>User ID:</b> <code>${userId}</code>\n` +
                `📱 <b>Device Hash:</b> <code>${deviceHash.slice(0, 16)}...</code>\n` +
                `👥 <b>Clustered Accounts:</b> ${accountsOnDevice}\n` +
                `🌐 <b>IP:</b> <code>${ipAddress}</code>\n` +
                `⚖️ <b>Action:</b> Permanent Blacklist`,
              { parse_mode: "HTML" }
            )
            .catch(() => {});
        }

        client.release();
        return res.status(403).json({ error: "Access Denied: Multiple accounts on one device" });
      }

      // Update user risk score and last seen metadata
      await client.query(
        `UPDATE users 
         SET risk_score = LEAST(100, GREATEST(risk_score, $1)),
             primary_device_hash = COALESCE(primary_device_hash, $2),
             last_ip_address = $3
         WHERE id = $4`,
        [calculatedRisk, deviceHash, ipAddress, userId]
      );
    }

    client.release();
    next();
  } catch (err) {
    client.release();
    console.error("Anti-fraud middleware error:", err);
    next();
  }
}

export async function logSecurityEvent(
  client: any,
  userId: number | string | bigint,
  type: string,
  severity: string,
  details: any
) {
  try {
    await client.query(
      "INSERT INTO security_audit_logs (user_id, event_type, severity, details) VALUES ($1, $2, $3, $4)",
      [userId.toString(), type, severity, JSON.stringify(details)]
    );
  } catch (err: any) {
    console.warn("[Security Log error]:", err.message);
  }
}

export default antiFraudCheck;
