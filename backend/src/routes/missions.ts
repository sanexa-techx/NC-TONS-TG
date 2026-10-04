import { Router } from "express";
import { pool } from "../db/db.js";

const router = Router();
export const VISIT_MIN_STAY_SECONDS = 15;

// Step 1: User taps Visit -> Record start timestamp
router.post("/visit/start", async (req, res) => {
  const userId =
    req.body.userId ||
    req.headers["x-telegram-user-id"] ||
    req.headers["x-dev-telegram-id"] ||
    (req as any).telegramUser?.id;
  const missionId = req.body.missionId;
  if (!userId || !missionId) return res.status(400).json({ error: "Missing parameters" });

  try {
    // Ensure user exists
    await pool.query(
      `INSERT INTO users (id, first_name) VALUES ($1, 'Miner') ON CONFLICT (id) DO NOTHING`,
      [userId]
    );

    await pool.query(
      `INSERT INTO mission_visit_sessions (user_id, mission_id, started_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id, mission_id) 
       DO UPDATE SET started_at = NOW()`,
      [userId, missionId]
    );

    return res.json({ success: true, minStaySeconds: VISIT_MIN_STAY_SECONDS });
  } catch (err) {
    console.error("Visit start error:", err);
    return res.status(500).json({ error: "Failed to initialize visit session" });
  }
});

// Step 2: User returns & taps Claim -> Enforce 15-second minimum
router.post("/visit/claim", async (req, res) => {
  const userId =
    req.body.userId ||
    req.headers["x-telegram-user-id"] ||
    req.headers["x-dev-telegram-id"] ||
    (req as any).telegramUser?.id;
  const missionId = req.body.missionId;
  if (!userId || !missionId) return res.status(400).json({ error: "Missing parameters" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Check visit duration
    const sessionRes = await client.query(
      `SELECT *, EXTRACT(EPOCH FROM (NOW() - started_at))::INT as elapsed_seconds
       FROM mission_visit_sessions 
       WHERE user_id = $1 AND mission_id = $2 
       FOR UPDATE`,
      [userId, missionId]
    );

    if (sessionRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "No active visit session found. Tap Visit first." });
    }

    const session = sessionRes.rows[0];
    const elapsedSeconds = session.elapsed_seconds != null ? Number(session.elapsed_seconds) : 0;
    if (elapsedSeconds < VISIT_MIN_STAY_SECONDS) {
      const waitRemaining = VISIT_MIN_STAY_SECONDS - elapsedSeconds;
      await client.query("ROLLBACK");
      return res.status(403).json({
        error: "Minimum dwell time not met",
        remainingSeconds: waitRemaining,
        message: `Stay on the partner site for at least 15 seconds. (${waitRemaining}s left)`,
      });
    }

    // 2. Check if already claimed
    const claimCheck = await client.query(
      "SELECT id FROM user_mission_claims WHERE user_id = $1 AND mission_id = $2",
      [userId, missionId]
    );
    if (claimCheck.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Mission already claimed." });
    }

    // 3. Fetch mission reward
    const missionRes = await client.query(
      "SELECT id, nc_reward, ton_reward, completed_count, target_users FROM dynamic_missions WHERE id = $1 AND is_active = TRUE",
      [missionId]
    );
    if (missionRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Mission not found or inactive" });
    }
    const mission = missionRes.rows[0];

    if (mission.target_users !== null && mission.completed_count >= mission.target_users) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Mission reward budget has been exhausted" });
    }

    // Ensure user exists
    await client.query(
      `INSERT INTO users (id, first_name) VALUES ($1, 'Miner') ON CONFLICT (id) DO NOTHING`,
      [userId]
    );

    // 4. Record claim and delete visit session
    await client.query(
      "INSERT INTO user_mission_claims (user_id, mission_id, claimed_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING",
      [userId, missionId]
    );
    await client.query(
      "INSERT INTO mission_claims (user_id, mission_id, claimed_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING",
      [userId, missionId]
    );
    await client.query(
      "DELETE FROM mission_visit_sessions WHERE user_id = $1 AND mission_id = $2",
      [userId, missionId]
    );

    // Increment completed count
    await client.query(
      "UPDATE dynamic_missions SET completed_count = completed_count + 1 WHERE id = $1",
      [missionId]
    );

    // 5. Credit user rewards
    const updatedUser = await client.query(
      `UPDATE users 
       SET nc_balance = nc_balance + $1,
           ton_balance = ton_balance + $2
       WHERE id = $3
       RETURNING nc_balance, ton_balance`,
      [mission.nc_reward, mission.ton_reward, userId]
    );

    await client.query("COMMIT");
    return res.json({
      success: true,
      reward: { nc: mission.nc_reward, ton: parseFloat(mission.ton_reward) },
      newBalances: updatedUser.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Visit claim error:", err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

export default router;
