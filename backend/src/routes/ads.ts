import { Router } from "express";
import { pool } from "../db/db.js";

const router = Router();

export const AD_LIMITS = {
  adsgram: { max: 25, minWithdraw: 8, nc: 200, ton: 0.000300 },
  monetag: { max: 15, minWithdraw: 4, nc: 200, ton: 0.000200 },
};

// 1. Get User Daily Ad Status
router.get("/status", async (req, res) => {
  const userId = req.query.userId || req.headers['x-telegram-user-id'] || req.headers['x-dev-telegram-id'] || (req as any).telegramUser?.id;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const result = await pool.query(
      `SELECT adsgram_count, monetag_count 
       FROM user_daily_ads 
       WHERE user_id = $1 AND ad_date = CURRENT_DATE`,
      [userId]
    );

    const counts = result.rows[0] || { adsgram_count: 0, monetag_count: 0 };
    const adsgramWatched = Number(counts.adsgram_count || 0);
    const monetagWatched = Number(counts.monetag_count || 0);

    return res.json({
      adsgram: {
        watched: adsgramWatched,
        max: AD_LIMITS.adsgram.max,
        requiredForWithdraw: AD_LIMITS.adsgram.minWithdraw,
        isWithdrawUnlocked: adsgramWatched >= AD_LIMITS.adsgram.minWithdraw,
      },
      monetag: {
        watched: monetagWatched,
        max: AD_LIMITS.monetag.max,
        requiredForWithdraw: AD_LIMITS.monetag.minWithdraw,
        isWithdrawUnlocked: monetagWatched >= AD_LIMITS.monetag.minWithdraw,
      },
      canWithdraw:
        adsgramWatched >= AD_LIMITS.adsgram.minWithdraw &&
        monetagWatched >= AD_LIMITS.monetag.minWithdraw,
    });
  } catch (err) {
    console.error("Ad status error:", err);
    return res.status(500).json({ error: "Database error" });
  }
});

// 2. Claim Ad Reward (Called after verified ad view)
router.post("/claim", async (req, res) => {
  const userId = req.body.userId || req.headers['x-telegram-user-id'] || req.headers['x-dev-telegram-id'] || (req as any).telegramUser?.id;
  const provider = req.body.provider; // provider: 'adsgram' | 'monetag'

  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  if (!["adsgram", "monetag"].includes(provider)) {
    return res.status(400).json({ error: "Invalid ad provider" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Ensure user exists in users table
    await client.query(
      `INSERT INTO users (id, first_name)
       VALUES ($1, 'Miner')
       ON CONFLICT (id) DO NOTHING`,
      [userId]
    );

    // Initialize or get today's record
    await client.query(
      `INSERT INTO user_daily_ads (user_id, ad_date, adsgram_count, monetag_count)
       VALUES ($1, CURRENT_DATE, 0, 0)
       ON CONFLICT (user_id, ad_date) DO NOTHING`,
      [userId]
    );

    const recordRes = await client.query(
      `SELECT adsgram_count, monetag_count, last_ad_at,
              EXTRACT(EPOCH FROM (NOW() - last_ad_at)) as seconds_since_last_ad
       FROM user_daily_ads 
       WHERE user_id = $1 AND ad_date = CURRENT_DATE FOR UPDATE`,
      [userId]
    );
    const counts = recordRes.rows[0];

    // Check rate limit & cooldown (minimum 20s between claims)
    const secondsSince = counts?.seconds_since_last_ad != null 
      ? Number(counts.seconds_since_last_ad) 
      : (counts?.last_ad_at ? (Date.now() - new Date(counts.last_ad_at).getTime()) / 1000 : 999);

    if (Number(counts.adsgram_count || 0) > 0 || Number(counts.monetag_count || 0) > 0) {
      if (secondsSince < 10) {
        await client.query("ROLLBACK");
        const waitSec = Math.ceil(10 - secondsSince);
        return res.status(429).json({ error: `Please wait ${waitSec}s between ad watches` });
      }
    }

    if (provider === "adsgram" && counts.adsgram_count >= AD_LIMITS.adsgram.max) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: `Daily limit reached for Adsgram (${AD_LIMITS.adsgram.max}/${AD_LIMITS.adsgram.max})` });
    }

    if (provider === "monetag" && counts.monetag_count >= AD_LIMITS.monetag.max) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: `Daily limit reached for Monetag (${AD_LIMITS.monetag.max}/${AD_LIMITS.monetag.max})` });
    }

    const config = AD_LIMITS[provider as "adsgram" | "monetag"];

    // Increment count
    await client.query(
      `UPDATE user_daily_ads 
       SET ${provider}_count = ${provider}_count + 1,
           last_ad_at = NOW()
       WHERE user_id = $1 AND ad_date = CURRENT_DATE`,
      [userId]
    );

    // Credit dual reward to user balance
    const userRes = await client.query(
      `UPDATE users 
       SET nc_balance = nc_balance + $1,
           ton_balance = ton_balance + $2
       WHERE id = $3
       RETURNING nc_balance, ton_balance`,
      [config.nc, config.ton, userId]
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      reward: { nc: config.nc, ton: config.ton },
      newBalances: userRes.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Ad claim error:", err);
    return res.status(500).json({ error: "Claim processing failed" });
  } finally {
    client.release();
  }
});

// 3. Adsgram Server-to-Server (S2S) Reward Webhook (GET / POST)
// Configured in Adsgram Dashboard -> Ad Block -> Reward URL:
// https://nctons-backend.onrender.com/api/ads/reward?userid=[userId]
router.all(["/reward", "/adsgram-reward"], async (req, res) => {
  const userId =
    req.query.userid ||
    req.query.userId ||
    req.query.user_id ||
    req.body?.userid ||
    req.body?.userId ||
    req.body?.user_id;

  if (!userId) {
    return res.status(400).send("Missing userid");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Ensure user exists
    await client.query(
      `INSERT INTO users (id, first_name)
       VALUES ($1, 'Miner')
       ON CONFLICT (id) DO NOTHING`,
      [userId]
    );

    // Initialize daily ads record
    await client.query(
      `INSERT INTO user_daily_ads (user_id, ad_date, adsgram_count, monetag_count)
       VALUES ($1, CURRENT_DATE, 0, 0)
       ON CONFLICT (user_id, ad_date) DO NOTHING`,
      [userId]
    );

    const recordRes = await client.query(
      `SELECT adsgram_count, monetag_count, last_ad_at,
              EXTRACT(EPOCH FROM (NOW() - last_ad_at)) as seconds_since_last_ad
       FROM user_daily_ads 
       WHERE user_id = $1 AND ad_date = CURRENT_DATE FOR UPDATE`,
      [userId]
    );
    const counts = recordRes.rows[0];

    // Anti-spam cooldown (10s)
    const secondsSince = counts?.seconds_since_last_ad != null 
      ? Number(counts.seconds_since_last_ad) 
      : (counts?.last_ad_at ? (Date.now() - new Date(counts.last_ad_at).getTime()) / 1000 : 999);

    if (Number(counts?.adsgram_count || 0) > 0) {
      if (secondsSince < 10) {
        await client.query("ROLLBACK");
        return res.status(200).send("Cooldown active");
      }
    }

    if (counts.adsgram_count >= AD_LIMITS.adsgram.max) {
      await client.query("ROLLBACK");
      return res.status(200).send("Daily limit reached");
    }

    const config = AD_LIMITS.adsgram;

    // Increment count & timestamp
    await client.query(
      `UPDATE user_daily_ads 
       SET adsgram_count = adsgram_count + 1,
           last_ad_at = NOW()
       WHERE user_id = $1 AND ad_date = CURRENT_DATE`,
      [userId]
    );

    // Credit balance (+200 NC, +0.000300 TON)
    await client.query(
      `UPDATE users 
       SET nc_balance = nc_balance + $1,
           ton_balance = ton_balance + $2
       WHERE id = $3`,
      [config.nc, config.ton, userId]
    );

    await client.query("COMMIT");
    console.log(`[Adsgram S2S] Reward credited to user ${userId}: +${config.nc} NC, +${config.ton} TON`);
    return res.status(200).send("OK");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Adsgram S2S reward error:", err);
    return res.status(500).send("Error");
  } finally {
    client.release();
  }
});

// 4. Dev / Test Helper to configure ad counts & test balance
router.post("/dev-set", async (req, res) => {
  const { userId, adsgram, monetag, addTon } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO users (id, first_name)
       VALUES ($1, 'Miner')
       ON CONFLICT (id) DO NOTHING`,
      [userId]
    );

    await client.query(
      `INSERT INTO user_daily_ads (user_id, ad_date, adsgram_count, monetag_count)
       VALUES ($1, CURRENT_DATE, 0, 0)
       ON CONFLICT (user_id, ad_date) DO NOTHING`,
      [userId]
    );

    await client.query(
      `UPDATE user_daily_ads 
       SET adsgram_count = $1, monetag_count = $2 
       WHERE user_id = $3 AND ad_date = CURRENT_DATE`,
      [Number(adsgram ?? 8), Number(monetag ?? 4), userId]
    );

    if (addTon) {
      await client.query(
        `UPDATE users SET ton_balance = ton_balance + $1 WHERE id = $2`,
        [Number(addTon), userId]
      );
    }

    return res.json({ success: true, adsgram, monetag, addTon });
  } catch (err) {
    return res.status(500).json({ error: "Failed to set counts" });
  } finally {
    client.release();
  }
});

export default router;

