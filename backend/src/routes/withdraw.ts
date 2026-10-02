import { Router } from "express";
import { pool } from "../db/db.js";
import { sendWithdrawalApprovalCard } from "../bot/notifications.js";
import { syncWithdrawalToNotion } from "../services/notionService.js";

const router = Router();

// Helper: Ensure user record exists with refreshed daily/weekly calendar cycles
export async function getOrCreateLimitTracker(client: any, userId: number | string | bigint) {
  const uid = userId.toString();
  await client.query(
    `INSERT INTO user_withdrawal_limits (user_id, tracked_date, tracked_week)
     VALUES ($1, CURRENT_DATE, DATE_TRUNC('week', CURRENT_DATE)::DATE)
     ON CONFLICT (user_id) DO NOTHING`,
    [uid]
  );

  // Fetch with row-level lock
  const res = await client.query(
    `SELECT *, 
            CURRENT_DATE as today_utc,
            DATE_TRUNC('week', CURRENT_DATE)::DATE as this_week_utc
     FROM user_withdrawal_limits 
     WHERE user_id = $1 FOR UPDATE`,
    [uid]
  );

  let tracker = res.rows[0];
  const todayStr = new Date(tracker.today_utc).toISOString().slice(0, 10);
  const trackedDateStr = new Date(tracker.tracked_date).toISOString().slice(0, 10);
  const thisWeekStr = new Date(tracker.this_week_utc).toISOString().slice(0, 10);
  const trackedWeekStr = new Date(tracker.tracked_week).toISOString().slice(0, 10);

  let needsUpdate = false;
  let newDailyExtra = Number(tracker.daily_extra_slots || 0);
  let newDailyAds = Number(tracker.daily_break_ads || 0);
  let newWeeklyExtra = Number(tracker.weekly_extra_slots || 0);
  let newWeeklyAds = Number(tracker.weekly_break_ads || 0);

  // Daily reset check
  if (todayStr !== trackedDateStr) {
    newDailyExtra = 0;
    newDailyAds = 0;
    needsUpdate = true;
  }

  // Weekly reset check
  if (thisWeekStr !== trackedWeekStr) {
    newWeeklyExtra = 0;
    newWeeklyAds = 0;
    needsUpdate = true;
  }

  if (needsUpdate) {
    const updateRes = await client.query(
      `UPDATE user_withdrawal_limits 
       SET tracked_date = CURRENT_DATE,
           daily_extra_slots = $1,
           daily_break_ads = $2,
           tracked_week = DATE_TRUNC('week', CURRENT_DATE)::DATE,
           weekly_extra_slots = $3,
           weekly_break_ads = $4,
           updated_at = NOW()
       WHERE user_id = $5
       RETURNING *`,
      [newDailyExtra, newDailyAds, newWeeklyExtra, newWeeklyAds, uid]
    );
    tracker = updateRes.rows[0];
  }

  return tracker;
}

// 1. GET Current Withdrawal Limits & Status
router.get("/limits", async (req, res) => {
  const rawUserId =
    req.query.userId ||
    req.telegramUser?.id ||
    req.headers["x-telegram-user-id"] ||
    req.headers["x-dev-telegram-id"];
  if (!rawUserId) return res.status(400).json({ error: "Missing userId" });
  const userId = rawUserId.toString();

  const client = await pool.connect();
  try {
    const tracker = await getOrCreateLimitTracker(client, userId);

    // Count today's non-rejected requests
    const dailyCountRes = await client.query(
      `SELECT COUNT(*)::INT as count FROM withdrawals 
       WHERE user_id = $1 
         AND DATE(created_at) = CURRENT_DATE 
         AND status != 'REJECTED'`,
      [userId.toString()]
    );
    const todayUsed = Number(dailyCountRes.rows[0]?.count || 0);

    // Count this week's non-rejected requests
    const weeklyCountRes = await client.query(
      `SELECT COUNT(*)::INT as count FROM withdrawals 
       WHERE user_id = $1 
         AND created_at >= DATE_TRUNC('week', CURRENT_DATE) 
         AND status != 'REJECTED'`,
      [userId.toString()]
    );
    const weekUsed = Number(weeklyCountRes.rows[0]?.count || 0);

    const maxDailyAllowed = 1 + Number(tracker.daily_extra_slots || 0);
    const maxWeeklyAllowed = 5 + Number(tracker.weekly_extra_slots || 0);

    return res.json({
      daily: {
        used: todayUsed,
        allowed: maxDailyAllowed,
        isLimitReached: todayUsed >= maxDailyAllowed,
        breakAdsWatched: Number(tracker.daily_break_ads || 0),
        breakAdsRequired: 30,
        extraSlotsEarned: Number(tracker.daily_extra_slots || 0),
      },
      weekly: {
        used: weekUsed,
        allowed: maxWeeklyAllowed,
        isLimitReached: weekUsed >= maxWeeklyAllowed,
        breakAdsWatched: Number(tracker.weekly_break_ads || 0),
        breakAdsRequired: 150,
        extraSlotsEarned: Number(tracker.weekly_extra_slots || 0),
      },
      canWithdraw: todayUsed < maxDailyAllowed && weekUsed < maxWeeklyAllowed,
    });
  } catch (err) {
    console.error("Fetch limits error:", err);
    return res.status(500).json({ error: "Failed to fetch withdrawal limits" });
  } finally {
    client.release();
  }
});

// 2. POST Record Ad Watch Towards Breaking Limits
router.post("/break-limit/watch-ad", async (req, res) => {
  const rawUserId =
    req.body.userId ||
    req.telegramUser?.id ||
    req.headers["x-telegram-user-id"] ||
    req.headers["x-dev-telegram-id"];
  const { target } = req.body; // target: 'daily' | 'weekly'
  if (!rawUserId || !["daily", "weekly"].includes(target)) {
    return res.status(400).json({ error: "Invalid target or missing userId" });
  }
  const userId = rawUserId.toString();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const tracker = await getOrCreateLimitTracker(client, userId);

    let updatedSlots = 0;
    let message = "";

    if (target === "daily") {
      const newCount = Number(tracker.daily_break_ads || 0) + 1;
      let extra = Number(tracker.daily_extra_slots || 0);

      if (newCount >= 30) {
        extra += 1;
        await client.query(
          `UPDATE user_withdrawal_limits 
           SET daily_break_ads = 0, daily_extra_slots = $1, updated_at = NOW() 
           WHERE user_id = $2`,
          [extra, userId]
        );
        message = "🎉 Daily limit broken! +1 extra withdrawal unlocked for today.";
      } else {
        await client.query(
          `UPDATE user_withdrawal_limits 
           SET daily_break_ads = $1, updated_at = NOW() 
           WHERE user_id = $2`,
          [newCount, userId]
        );
        message = `Progress: ${newCount}/30 ads watched toward daily limit break.`;
      }
      updatedSlots = extra;
    }

    if (target === "weekly") {
      const newCount = Number(tracker.weekly_break_ads || 0) + 1;
      let extra = Number(tracker.weekly_extra_slots || 0);

      if (newCount >= 150) {
        extra += 1;
        await client.query(
          `UPDATE user_withdrawal_limits 
           SET weekly_break_ads = 0, weekly_extra_slots = $1, updated_at = NOW() 
           WHERE user_id = $2`,
          [extra, userId]
        );
        message = "🎉 Weekly limit broken! +1 extra withdrawal unlocked for this week.";
      } else {
        await client.query(
          `UPDATE user_withdrawal_limits 
           SET weekly_break_ads = $1, updated_at = NOW() 
           WHERE user_id = $2`,
          [newCount, userId]
        );
        message = `Progress: ${newCount}/150 ads watched toward weekly limit break.`;
      }
      updatedSlots = extra;
    }

    await client.query("COMMIT");
    return res.json({ success: true, message, extraSlots: updatedSlots });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to record break-limit ad:", err);
    return res.status(500).json({ error: "Failed to record break-limit ad" });
  } finally {
    client.release();
  }
});

// 3. WITHDRAWAL SUBMISSION VERIFICATION (Enforce 1/day & 5/week)
router.post("/request", async (req, res) => {
  const rawUserId =
    req.telegramUser?.id ||
    req.body.userId ||
    req.headers["x-telegram-user-id"] ||
    req.headers["x-dev-telegram-id"];
  if (!rawUserId) return res.status(400).json({ error: "Missing userId" });
  const userId = rawUserId.toString();

  const { tonAddress, amountTon, tonAmount } = req.body;
  const rawAmount = amountTon !== undefined ? amountTon : tonAmount;
  const parsedAmount = parseFloat(rawAmount);

  if (!tonAddress || typeof tonAddress !== "string" || tonAddress.length < 24) {
    return res.status(400).json({ error: "Invalid TON wallet address" });
  }

  if (isNaN(parsedAmount) || parsedAmount < 0.01) {
    return res.status(400).json({ error: "Minimum withdrawal amount is 0.01 TON" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // A. Verify baseline 8 Adsgram + 4 Monetag quota
    const adCheck = await client.query(
      `SELECT adsgram_count, monetag_count 
       FROM user_daily_ads 
       WHERE user_id = $1 AND ad_date = CURRENT_DATE`,
      [userId]
    );
    const counts = adCheck.rows[0] || { adsgram_count: 0, monetag_count: 0 };
    const adsgramCount = Number(counts.adsgram_count || 0);
    const monetagCount = Number(counts.monetag_count || 0);
    const isGateUnlocked =
      (adsgramCount >= 8 && monetagCount >= 4) ||
      (adsgramCount >= 4 && monetagCount >= 8);

    if (!isGateUnlocked) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        error: "Daily ad requirement not met! Watch 8 Adsgram & 4 Monetag ads first.",
      });
    }

    // B. Check Daily Limit (1/day + daily_extra_slots)
    const tracker = await getOrCreateLimitTracker(client, userId);

    const dailyUsageRes = await client.query(
      `SELECT COUNT(*)::INT as count FROM withdrawals 
       WHERE user_id = $1 AND DATE(created_at) = CURRENT_DATE AND status != 'REJECTED'`,
      [userId]
    );
    const dailyUsed = Number(dailyUsageRes.rows[0]?.count || 0);
    const dailyAllowed = 1 + Number(tracker.daily_extra_slots || 0);

    if (dailyUsed >= dailyAllowed) {
      await client.query("ROLLBACK");
      return res.status(429).json({
        error: "Daily withdrawal limit reached (1/day).",
        limitType: "daily",
        progress: `${tracker.daily_break_ads}/30`,
        message: "You have used your daily withdrawal quota. Watch 30 ads to break the limit!",
      });
    }

    // C. Check Weekly Limit (5/week + weekly_extra_slots)
    const weeklyUsageRes = await client.query(
      `SELECT COUNT(*)::INT as count FROM withdrawals 
       WHERE user_id = $1 AND created_at >= DATE_TRUNC('week', CURRENT_DATE) AND status != 'REJECTED'`,
      [userId]
    );
    const weeklyUsed = Number(weeklyUsageRes.rows[0]?.count || 0);
    const weeklyAllowed = 5 + Number(tracker.weekly_extra_slots || 0);

    if (weeklyUsed >= weeklyAllowed) {
      await client.query("ROLLBACK");
      return res.status(429).json({
        error: "Weekly withdrawal limit reached (5/week).",
        limitType: "weekly",
        progress: `${tracker.weekly_break_ads}/150`,
        message: "You have used your weekly limit of 5 withdrawals. Watch 150 ads to break the limit!",
      });
    }

    // D. Check balance & level restriction
    const userRes = await client.query(
      `SELECT id, ton_balance, miner_level, username, first_name, is_banned, ban_reason, risk_score FROM users WHERE id = $1 FOR UPDATE`,
      [userId]
    );
    const user = userRes.rows[0];
    if (!user) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "User not found" });
    }

    // Block banned users immediately
    if (user.is_banned) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        error: "Your account is flagged for security violations.",
        reason: user.ban_reason || "Violation of Fair-Play Security Policy",
      });
    }

    const currentTon = parseFloat(user.ton_balance?.toString() || "0");
    if (currentTon < parsedAmount) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: `Insufficient TON balance. Available: ${currentTon.toFixed(4)} TON, Requested: ${parsedAmount.toFixed(4)} TON`,
      });
    }

    const userLevel = Number(user.miner_level || 1);
    if (userLevel < 2 && parsedAmount > 0.5) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        error: "Level 2 required to withdraw more than 0.5 TON.",
        details: {
          currentLevel: userLevel,
          requiredLevel: 2,
          maxWithdrawForLevel: 0.5,
          requestedAmount: parsedAmount,
          message:
            "Level 1 miners can withdraw up to 0.50 TON. Upgrade your rig to Level 2 by watching 50 ads in one day to unlock payouts above 0.5 TON!",
        },
      });
    }

    // E. Deduct balance and create withdrawal
    await client.query(
      `UPDATE users SET ton_balance = ton_balance - $1 WHERE id = $2`,
      [parsedAmount, userId]
    );

    const insertRes = await client.query(
      `INSERT INTO withdrawals (user_id, ton_address, ton_amount, status)
       VALUES ($1, $2, $3, 'PENDING')
       RETURNING id, user_id, ton_address, ton_amount, status, created_at`,
      [userId, tonAddress.trim(), parsedAmount]
    );
    const withdrawal = insertRes.rows[0];

    await client.query("COMMIT");

    // Notification to admin channel
    try {
      const channelMsgId = await sendWithdrawalApprovalCard(
        withdrawal.id,
        BigInt(user.id),
        user.username,
        user.first_name,
        withdrawal.ton_address,
        Number(withdrawal.ton_amount).toFixed(4),
        Number(user.risk_score || 0)
      );
      if (channelMsgId) {
        await pool.query(
          `UPDATE withdrawals SET channel_message_id = $1 WHERE id = $2`,
          [channelMsgId, withdrawal.id]
        );
      }
    } catch (botErr: any) {
      console.warn("[Bot] Failed to send approval card:", botErr.message);
    }

    syncWithdrawalToNotion({
      id: withdrawal.id,
      userId: BigInt(user.id),
      tonAddress: withdrawal.ton_address,
      tonAmount: Number(withdrawal.ton_amount).toFixed(4),
      status: withdrawal.status,
      createdAt: withdrawal.created_at,
    }).catch((err) =>
      console.warn("[Notion] Sync withdrawal notice:", err.message)
    );

    const remainingBal = (currentTon - parsedAmount).toFixed(6);

    return res.json({
      success: true,
      message: "Withdrawal request submitted for admin approval",
      withdrawal: {
        id: withdrawal.id,
        tonAddress: withdrawal.ton_address,
        tonAmount: Number(withdrawal.ton_amount).toFixed(4),
        status: withdrawal.status,
        createdAt: withdrawal.created_at,
      },
      remainingBalance: remainingBal,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Withdrawal transaction failed:", err);
    return res.status(500).json({ error: "Withdrawal transaction failed" });
  } finally {
    client.release();
  }
});

// 4. GET Withdrawal History
router.get("/history", async (req, res) => {
  const rawUserId =
    req.telegramUser?.id ||
    req.query.userId ||
    req.headers["x-telegram-user-id"] ||
    req.headers["x-dev-telegram-id"];
  if (!rawUserId) return res.status(400).json({ error: "Missing userId" });
  const userId = rawUserId.toString();

  try {
    const historyRes = await pool.query(
      `SELECT id, ton_address, ton_amount, status, created_at 
       FROM withdrawals 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 20`,
      [userId]
    );

    return res.json({
      history: historyRes.rows.map((w: any) => ({
        id: w.id,
        tonAddress: w.ton_address,
        tonAmount: Number(w.ton_amount).toFixed(4),
        status: w.status,
        createdAt: w.created_at,
      })),
    });
  } catch (err) {
    console.error("Fetch withdrawal history error:", err);
    return res.status(500).json({ error: "Failed to fetch withdrawal history" });
  }
});

// 5. GET Overall Withdrawal Status (combines gate, limits, level)
router.get("/status", async (req, res) => {
  const rawUserId =
    req.query.userId ||
    req.telegramUser?.id ||
    req.headers["x-telegram-user-id"] ||
    req.headers["x-dev-telegram-id"];
  if (!rawUserId) return res.status(400).json({ error: "Missing userId" });
  const userId = rawUserId.toString();

  const client = await pool.connect();
  try {
    const tracker = await getOrCreateLimitTracker(client, userId);

    const dailyCountRes = await client.query(
      `SELECT COUNT(*)::INT as count FROM withdrawals 
       WHERE user_id = $1 
         AND DATE(created_at) = CURRENT_DATE 
         AND status != 'REJECTED'`,
      [userId.toString()]
    );
    const todayUsed = Number(dailyCountRes.rows[0]?.count || 0);

    const weeklyCountRes = await client.query(
      `SELECT COUNT(*)::INT as count FROM withdrawals 
       WHERE user_id = $1 
         AND created_at >= DATE_TRUNC('week', CURRENT_DATE) 
         AND status != 'REJECTED'`,
      [userId.toString()]
    );
    const weekUsed = Number(weeklyCountRes.rows[0]?.count || 0);

    const maxDailyAllowed = 1 + Number(tracker.daily_extra_slots || 0);
    const maxWeeklyAllowed = 5 + Number(tracker.weekly_extra_slots || 0);

    const adCheck = await client.query(
      `SELECT adsgram_count, monetag_count 
       FROM user_daily_ads 
       WHERE user_id = $1 AND ad_date = CURRENT_DATE`,
      [userId.toString()]
    );
    const counts = adCheck.rows[0] || { adsgram_count: 0, monetag_count: 0 };
    const adsgramWatched = Number(counts.adsgram_count || 0);
    const monetagWatched = Number(counts.monetag_count || 0);
    const isGateUnlocked =
      (adsgramWatched >= 8 && monetagWatched >= 4) ||
      (adsgramWatched >= 4 && monetagWatched >= 8);

    const userRes = await client.query(
      `SELECT miner_level FROM users WHERE id = $1`,
      [userId.toString()]
    );
    const userLevel = Number(userRes.rows[0]?.miner_level || 1);
    const canWithdrawOverHalfTon = userLevel >= 2;

    const canWithdraw =
      isGateUnlocked &&
      todayUsed < maxDailyAllowed &&
      weekUsed < maxWeeklyAllowed;

    let blockReason: string | null = null;
    if (!isGateUnlocked) {
      blockReason =
        "Daily withdrawal gate locked: Watch 8 Adsgram and 4 Monetag ads today";
    } else if (todayUsed >= maxDailyAllowed) {
      blockReason = `Daily withdrawal limit reached (${todayUsed}/${maxDailyAllowed}). Watch 30 ads to break limit!`;
    } else if (weekUsed >= maxWeeklyAllowed) {
      blockReason = `Weekly withdrawal limit reached (${weekUsed}/${maxWeeklyAllowed}). Watch 150 ads to break limit!`;
    }

    return res.json({
      success: true,
      daily: {
        used: todayUsed,
        allowed: maxDailyAllowed,
        isLimitReached: todayUsed >= maxDailyAllowed,
        breakAdsWatched: Number(tracker.daily_break_ads || 0),
        breakAdsRequired: 30,
        extraSlotsEarned: Number(tracker.daily_extra_slots || 0),
      },
      weekly: {
        used: weekUsed,
        allowed: maxWeeklyAllowed,
        isLimitReached: weekUsed >= maxWeeklyAllowed,
        breakAdsWatched: Number(tracker.weekly_break_ads || 0),
        breakAdsRequired: 150,
        extraSlotsEarned: Number(tracker.weekly_extra_slots || 0),
      },
      gate: {
        adsgramWatched,
        adsgramRequired: 8,
        monetagWatched,
        monetagRequired: 4,
        isUnlocked: isGateUnlocked,
      },
      level: {
        currentLevel: userLevel,
        canWithdrawOverHalfTon,
        maxWithdrawTon: canWithdrawOverHalfTon ? null : 0.5,
      },
      canWithdraw,
      blockReason,
    });
  } catch (err) {
    console.error("Fetch withdrawal status error:", err);
    return res.status(500).json({ error: "Failed to fetch withdrawal status" });
  } finally {
    client.release();
  }
});

export default router;
