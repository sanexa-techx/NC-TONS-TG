import { Router } from "express";
import { pool } from "../db/db.js";
import { getUserWithdrawalLimits, watchWithdrawalLimitAd } from "../controllers/withdrawController.js";

const router = Router();
export const AD_COOLDOWN_SECONDS = 30;
export const MAX_ADS_PER_PROVIDER = 100;

// Helper: Calculate tiered reward based on current view number
// Tier 1 (Ads 1–20): +150 NC & +0.000010 TON (High eCPM window)
// Tier 2 (Ads 21–50): +200 NC & +0.000002 TON (Sustained payout window)
// Tier 3 (Ads 51–100): +300 NC & 0 TON (Fuel grind & Limit-Breaker progression; 100% risk-free for wallet)
export function calculateAdReward(currentCount: number): { nc: number; ton: number; tier: number } {
  const nextAdNumber = currentCount + 1;

  if (nextAdNumber <= 20) {
    return { nc: 150, ton: 0.000010, tier: 1 };
  } else if (nextAdNumber <= 50) {
    return { nc: 200, ton: 0.000002, tier: 2 };
  } else {
    return { nc: 300, ton: 0.000000, tier: 3 };
  }
}

export const AD_LIMITS = {
  adsgram: { max: MAX_ADS_PER_PROVIDER, minWithdraw: 0 },
  monetag: { max: MAX_ADS_PER_PROVIDER, minWithdraw: 4 },
};

// GET /api/ads/status
router.get("/status", async (req, res) => {
  const userId =
    req.query.userId ||
    req.headers["x-telegram-user-id"] ||
    req.headers["x-dev-telegram-id"] ||
    (req as any).telegramUser?.id;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const resDb = await pool.query(
      `SELECT adsgram_count, monetag_count, limit_ads_count,
              EXTRACT(EPOCH FROM (NOW() - last_ad_at))::INT as elapsed_seconds
       FROM user_daily_ads 
       WHERE user_id = $1 AND ad_date = CURRENT_DATE`,
      [userId]
    );

    const record = resDb.rows[0] || { adsgram_count: 0, monetag_count: 0, limit_ads_count: 0, elapsed_seconds: 999 };
    const elapsed = record.elapsed_seconds != null ? Number(record.elapsed_seconds) : 999;
    const cooldownRemaining = Math.max(0, AD_COOLDOWN_SECONDS - elapsed);

    let limits: any = null;
    try {
      limits = await getUserWithdrawalLimits(userId);
    } catch (e) {
      // fallback if limits query fails
    }

    const adsgramCount = Number(record.adsgram_count || 0);
    const monetagCount = Number(record.monetag_count || 0);

    return res.json({
      adsgram: {
        watched: adsgramCount,
        max: MAX_ADS_PER_PROVIDER,
        requiredForWithdraw: 0,
        isWithdrawUnlocked: true,
      },
      monetag: {
        watched: monetagCount,
        max: MAX_ADS_PER_PROVIDER,
        requiredForWithdraw: 4,
        isWithdrawUnlocked: monetagCount >= 4,
      },
      totalWatched: adsgramCount + monetagCount,
      totalMax: MAX_ADS_PER_PROVIDER * 2, // 200 total daily ads
      cooldownRemaining,
      canWithdraw: limits ? limits.canWithdraw : monetagCount >= 4,
      withdrawalLimits: limits,
    });
  } catch (err) {
    console.error("Ad status error:", err);
    return res.status(500).json({ error: "Failed to fetch ad status" });
  }
});

// POST /api/ads/claim
router.post("/claim", async (req, res) => {
  const userId =
    req.body.userId ||
    req.headers["x-telegram-user-id"] ||
    req.headers["x-dev-telegram-id"] ||
    (req as any).telegramUser?.id;
  const provider = req.body.provider; // 'monetag' | 'adsgram'

  if (!userId || !["monetag", "adsgram"].includes(provider)) {
    return res.status(400).json({ error: "Invalid parameters" });
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

    // 1. Fetch current daily record with row-level lock
    const adRes = await client.query(
      `SELECT *, EXTRACT(EPOCH FROM (NOW() - last_ad_at))::INT as elapsed_seconds
       FROM user_daily_ads 
       WHERE user_id = $1 AND ad_date = CURRENT_DATE 
       FOR UPDATE`,
      [userId]
    );

    const record = adRes.rows[0];

    // 2. Enforce 30-Second Cooldown
    if (record && record.last_ad_at && record.elapsed_seconds != null && record.elapsed_seconds < AD_COOLDOWN_SECONDS) {
      const remainingSeconds = AD_COOLDOWN_SECONDS - record.elapsed_seconds;
      await client.query("ROLLBACK");
      return res.status(429).json({
        error: "Ad cooldown active",
        remainingSeconds,
        message: `Please wait ${remainingSeconds}s before watching another ad.`,
      });
    }

    // 3. Verify 100/day limit
    const currentCount = record
      ? provider === "monetag"
        ? Number(record.monetag_count || 0)
        : Number(record.adsgram_count || 0)
      : 0;

    if (currentCount >= MAX_ADS_PER_PROVIDER) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        error: `Daily limit reached for ${provider} (${MAX_ADS_PER_PROVIDER}/${MAX_ADS_PER_PROVIDER}). Resets at 00:00 UTC.`,
      });
    }

    // 4. Calculate dynamic tiered reward
    const reward = calculateAdReward(currentCount);

    // 5. Update user daily ads counter and set last_ad_at timestamp
    const countCol = provider === "monetag" ? "monetag_count" : "adsgram_count";
    await client.query(
      `INSERT INTO user_daily_ads (user_id, ad_date, ${countCol}, last_ad_at)
       VALUES ($1, CURRENT_DATE, 1, NOW())
       ON CONFLICT (user_id, ad_date) 
       DO UPDATE SET ${countCol} = user_daily_ads.${countCol} + 1, last_ad_at = NOW()`,
      [userId]
    );

    // 6. Atomically credit user balances
    const updatedUser = await client.query(
      `UPDATE users 
       SET nc_balance = nc_balance + $1,
           ton_balance = ton_balance + $2
       WHERE id = $3
       RETURNING nc_balance, ton_balance`,
      [reward.nc, reward.ton, userId]
    );

    await client.query("COMMIT");
    return res.json({
      success: true,
      cooldown: AD_COOLDOWN_SECONDS,
      currentCount: currentCount + 1,
      maxDaily: MAX_ADS_PER_PROVIDER,
      reward: { nc: reward.nc, ton: reward.ton, tier: reward.tier },
      newBalances: updatedUser.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Ad claim error:", err);
    return res.status(500).json({ error: "Failed to record ad view" });
  } finally {
    client.release();
  }
});

// 3. Adsgram Server-to-Server (S2S) Reward Webhook (GET / POST)
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

    const recordRes = await client.query(
      `SELECT adsgram_count, monetag_count, last_ad_at,
              EXTRACT(EPOCH FROM (NOW() - last_ad_at))::INT as elapsed_seconds
       FROM user_daily_ads 
       WHERE user_id = $1 AND ad_date = CURRENT_DATE FOR UPDATE`,
      [userId]
    );
    const record = recordRes.rows[0];

    // Anti-spam cooldown (30s)
    if (record && record.last_ad_at && record.elapsed_seconds != null && record.elapsed_seconds < AD_COOLDOWN_SECONDS) {
      await client.query("ROLLBACK");
      return res.status(200).send("Cooldown active");
    }

    const currentCount = record ? Number(record.adsgram_count || 0) : 0;
    if (currentCount >= MAX_ADS_PER_PROVIDER) {
      await client.query("ROLLBACK");
      return res.status(200).send("Daily limit reached");
    }

    const reward = calculateAdReward(currentCount);

    // Increment count & timestamp
    await client.query(
      `INSERT INTO user_daily_ads (user_id, ad_date, adsgram_count, last_ad_at)
       VALUES ($1, CURRENT_DATE, 1, NOW())
       ON CONFLICT (user_id, ad_date)
       DO UPDATE SET adsgram_count = user_daily_ads.adsgram_count + 1, last_ad_at = NOW()`,
      [userId]
    );

    // Credit balance
    await client.query(
      `UPDATE users 
       SET nc_balance = nc_balance + $1,
           ton_balance = ton_balance + $2
       WHERE id = $3`,
      [reward.nc, reward.ton, userId]
    );

    await client.query("COMMIT");
    console.log(`[Adsgram S2S] Reward credited to user ${userId}: +${reward.nc} NC, +${reward.ton} TON (Tier ${reward.tier})`);
    return res.status(200).send("OK");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Adsgram S2S reward error:", err);
    return res.status(500).send("Error");
  } finally {
    client.release();
  }
});

// 4. Withdrawal Limit Ad Claim (Independent of Gate Ads)
router.post("/limit-claim", watchWithdrawalLimitAd);

// 5. Dev / Test Helper to configure ad counts & test balance
router.post("/dev-set", async (req, res) => {
  const { userId, adsgram, monetag, limitAds, addTon } = req.body;
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
      `INSERT INTO user_daily_ads (user_id, ad_date, adsgram_count, monetag_count, limit_ads_count)
       VALUES ($1, CURRENT_DATE, 0, 0, 0)
       ON CONFLICT (user_id, ad_date) DO NOTHING`,
      [userId]
    );

    await client.query(
      `UPDATE user_daily_ads 
       SET adsgram_count = $1, monetag_count = $2 
       WHERE user_id = $3 AND ad_date = CURRENT_DATE`,
      [Number(adsgram ?? 0), Number(monetag ?? 4), userId]
    );

    if (limitAds !== undefined) {
      await client.query(
        `UPDATE user_daily_ads 
         SET limit_ads_count = $1 
         WHERE user_id = $2 AND ad_date = CURRENT_DATE`,
        [Number(limitAds), userId]
      );
    }

    if (addTon) {
      await client.query(
        `UPDATE users SET ton_balance = ton_balance + $1 WHERE id = $2`,
        [Number(addTon), userId]
      );
    }

    return res.json({ success: true, adsgram, monetag, limitAds, addTon });
  } catch (err) {
    return res.status(500).json({ error: "Failed to set counts" });
  } finally {
    client.release();
  }
});

export default router;
