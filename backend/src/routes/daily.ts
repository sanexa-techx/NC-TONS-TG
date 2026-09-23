import { Router } from "express";
import { pool } from "../db/index.js";

const router = Router();

// 1. Get user streak status & rewards roadmap
router.get("/status", async (req, res) => {
  const userId = req.query.userId || (req as any).telegramUser?.id;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    await pool.query(
      `INSERT INTO users (id, first_name)
       VALUES ($1, 'Miner')
       ON CONFLICT (id) DO NOTHING`,
      [userId]
    );

    const userRes = await pool.query(
      `SELECT daily_streak, last_daily_claim_date,
              CURRENT_DATE as today_utc,
              CURRENT_DATE - INTERVAL '1 day' as yesterday_utc
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userRes.rows.length === 0) return res.status(404).json({ error: "User not found" });

    const user = userRes.rows[0];
    const ladderRes = await pool.query("SELECT * FROM daily_streak_rewards ORDER BY day_number ASC");

    let canClaim = false;
    let nextStreak = 1;

    if (!user.last_daily_claim_date) {
      canClaim = true;
      nextStreak = 1;
    } else {
      const lastClaim = new Date(user.last_daily_claim_date).toISOString().slice(0, 10);
      const today = new Date(user.today_utc).toISOString().slice(0, 10);
      const yesterday = new Date(user.yesterday_utc).toISOString().slice(0, 10);

      if (lastClaim === today) {
        canClaim = false;
        nextStreak = (user.daily_streak % 7) + 1;
      } else if (lastClaim === yesterday) {
        canClaim = true;
        nextStreak = (user.daily_streak % 7) + 1;
      } else {
        // Missed at least 1 full calendar day -> Streak reset to 1
        canClaim = true;
        nextStreak = 1;
      }
    }

    return res.json({
      currentStreak: user.daily_streak,
      canClaim,
      nextStreak,
      ladder: ladderRes.rows,
    });
  } catch (err) {
    return res.status(500).json({ error: "Database error" });
  }
});

// 2. Claim daily bonus
router.post("/claim", async (req, res) => {
  const userId = req.body?.userId || (req as any).telegramUser?.id;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const userRes = await client.query(
      `SELECT daily_streak, last_daily_claim_date, power_percentage,
              CURRENT_DATE as today_utc,
              CURRENT_DATE - INTERVAL '1 day' as yesterday_utc
       FROM users WHERE id = $1 FOR UPDATE`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "User not found" });
    }

    const user = userRes.rows[0];
    const today = new Date(user.today_utc).toISOString().slice(0, 10);
    const yesterday = new Date(user.yesterday_utc).toISOString().slice(0, 10);

    if (user.last_daily_claim_date) {
      const lastClaim = new Date(user.last_daily_claim_date).toISOString().slice(0, 10);
      if (lastClaim === today) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Daily bonus already claimed today" });
      }
    }

    // Determine streak index
    let newStreak = 1;
    if (user.last_daily_claim_date) {
      const lastClaim = new Date(user.last_daily_claim_date).toISOString().slice(0, 10);
      if (lastClaim === yesterday) {
        newStreak = (user.daily_streak % 7) + 1;
      }
    }

    // Fetch reward configuration for target day
    const rewardRes = await client.query(
      "SELECT * FROM daily_streak_rewards WHERE day_number = $1",
      [newStreak]
    );
    const reward = rewardRes.rows[0];

    // Atomically credit dual balance and optional battery fuel boost
    const updatedUser = await client.query(
      `UPDATE users 
       SET nc_balance = nc_balance + $1,
           ton_balance = ton_balance + $2,
           power_percentage = LEAST(100, power_percentage + $3),
           daily_streak = $4,
           last_daily_claim_date = CURRENT_DATE,
           total_daily_claims = total_daily_claims + 1,
           last_sync_at = NOW()
       WHERE id = $5
       RETURNING nc_balance, ton_balance, power_percentage, daily_streak`,
      [
        reward.nc_reward,
        reward.ton_reward,
        reward.battery_bonus_pct || 0,
        newStreak,
        userId,
      ]
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      streak: newStreak,
      reward: {
        nc: reward.nc_reward,
        ton: parseFloat(reward.ton_reward),
        batteryBoost: reward.battery_bonus_pct,
      },
      updatedBalances: updatedUser.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Daily claim error:", err);
    return res.status(500).json({ error: "Claim processing failed" });
  } finally {
    client.release();
  }
});

export default router;
