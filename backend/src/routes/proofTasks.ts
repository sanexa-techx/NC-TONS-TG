import { Router } from "express";
import multer from "multer";
import { Telegraf, Markup } from "telegraf";
import { pool } from "../db/index.js";
import { ENV } from "../config/env.js";
import { bot as globalBot } from "../bot/telegrafInstance.js";
import { syncTaskSubmissionToNotion } from "../services/notionService.js";

const router = Router();
const ADMIN_CHANNEL_ID = process.env.ADMIN_CHANNEL_ID || ENV.ADMIN_CHANNEL_ID;

// Configure multer for memory storage (max 5MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, and WebP images are allowed"));
    }
  },
});

// 1. Submit Screenshot Proof Endpoint
router.post("/submit", upload.single("proofImage"), async (req, res) => {
  const rawUserId = req.body.userId || (req as any).telegramUser?.id;
  const userId = parseInt(rawUserId, 10);
  const missionId = parseInt(req.body.missionId, 10);

  if (!userId || !missionId || !req.file) {
    return res.status(400).json({ error: "Missing user, mission ID, or image file" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check if task already completed or pending
    const existingClaim = await client.query(
      "SELECT id FROM user_mission_claims WHERE user_id = $1 AND mission_id = $2",
      [userId, missionId]
    );
    if (existingClaim.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Mission already completed" });
    }

    const existingSubmission = await client.query(
      "SELECT id, status FROM task_proof_submissions WHERE user_id = $1 AND mission_id = $2",
      [userId, missionId]
    );
    if (existingSubmission.rows.length > 0 && existingSubmission.rows[0].status === "PENDING_REVIEW") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Screenshot is already pending review" });
    }

    // Fetch mission details
    const missionRes = await client.query("SELECT * FROM dynamic_missions WHERE id = $1", [missionId]);
    if (missionRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Mission not found" });
    }
    const mission = missionRes.rows[0];

    // Create or update submission entry
    const insertRes = await client.query(
      `INSERT INTO task_proof_submissions (user_id, mission_id, status)
       VALUES ($1, $2, 'PENDING_REVIEW')
       ON CONFLICT (user_id, mission_id) 
       DO UPDATE SET status = 'PENDING_REVIEW', updated_at = NOW()
       RETURNING id`,
      [userId, missionId]
    );
    const submissionId = insertRes.rows[0].id;

    // Send screenshot to Admin Channel with action buttons (if bot & channel are configured)
    const caption = 
      `📸 <b>New Social Task Proof Submission</b>\n\n` +
      `👤 <b>User ID:</b> <code>${userId}</code>\n` +
      `🎯 <b>Task:</b> ${mission.title}\n` +
      `🔗 <b>Link:</b> ${mission.action_url}\n` +
      `💰 <b>Bounty:</b> +${mission.nc_reward} NC | +${parseFloat(mission.ton_reward).toFixed(6)} TON\n` +
      `⚙️ <b>Status:</b> ⏳ Pending Review`;

    let channelMessageId: number | string = Date.now();

    if (globalBot && ADMIN_CHANNEL_ID) {
      try {
        const channelPost = await globalBot.telegram.sendPhoto(
          ADMIN_CHANNEL_ID,
          { source: req.file.buffer },
          {
            caption,
            parse_mode: "HTML",
            ...Markup.inlineKeyboard([
              Markup.button.callback("Approve Task ✅", `task_appr:${submissionId}`),
              Markup.button.callback("Reject Proof ❌", `task_rej:${submissionId}`),
            ]),
          }
        );
        channelMessageId = channelPost.message_id;
      } catch (tgErr) {
        console.warn("Could not post screenshot to Telegram Admin Channel:", (tgErr as Error).message);
      }
    } else {
      console.log(`[Dev] Screenshot proof submitted for mission #${missionId} by user ${userId}. Telegram channel skipped in dev mode.`);
    }

    // Save channel message ID
    await client.query(
      "UPDATE task_proof_submissions SET channel_message_id = $1 WHERE id = $2",
      [channelMessageId, submissionId]
    );

    await client.query("COMMIT");

    // Optional asynchronous sync to Notion Tasks database
    syncTaskSubmissionToNotion({
      id: submissionId,
      userId,
      missionTitle: mission.title,
      status: 'PENDING_REVIEW',
      createdAt: new Date(),
    }).catch((err) => console.warn('[Notion] Sync task notice:', err.message));

    return res.json({ success: true, message: "Proof submitted for admin review", submissionId });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Proof upload error:", err);
    return res.status(500).json({ error: "Failed to upload proof" });
  } finally {
    client.release();
  }
});

// 2. Query Proof Submissions for a User
router.get("/user-status", async (req, res) => {
  const rawUserId = req.query.userId || (req as any).telegramUser?.id;
  if (!rawUserId) return res.status(400).json({ error: "Missing userId" });
  const userId = parseInt(rawUserId as string, 10);

  try {
    const result = await pool.query(
      "SELECT mission_id, status FROM task_proof_submissions WHERE user_id = $1",
      [userId]
    );
    const statusMap: Record<number, string> = {};
    for (const row of result.rows) {
      statusMap[row.mission_id] = row.status;
    }
    return res.json({ statusMap });
  } catch (err) {
    return res.status(500).json({ error: "Database error" });
  }
});

// 3. Resolve Submission Endpoint (Direct API review helper)
router.post("/resolve", async (req, res) => {
  const { submissionId, action, reviewerId } = req.body;
  if (!submissionId || !["appr", "rej"].includes(action)) {
    return res.status(400).json({ error: "Invalid submissionId or action" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const subRes = await client.query(
      `SELECT s.*, m.title, m.nc_reward, m.ton_reward 
       FROM task_proof_submissions s
       JOIN dynamic_missions m ON s.mission_id = m.id
       WHERE s.id = $1 FOR UPDATE`,
      [submissionId]
    );

    if (subRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Submission not found" });
    }

    const sub = subRes.rows[0];
    if (sub.status !== "PENDING_REVIEW") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: `Already resolved: ${sub.status}` });
    }

    const adminId = reviewerId || 123456789;

    if (action === "appr") {
      await client.query(
        "UPDATE task_proof_submissions SET status = 'APPROVED', reviewed_by = $1, updated_at = NOW() WHERE id = $2",
        [adminId, submissionId]
      );
      await client.query(
        "INSERT INTO user_mission_claims (user_id, mission_id) VALUES ($1, $2)",
        [sub.user_id, sub.mission_id]
      );
      await client.query(
        `UPDATE users 
         SET nc_balance = nc_balance + $1,
             ton_balance = ton_balance + $2
         WHERE id = $3`,
        [sub.nc_reward, sub.ton_reward, sub.user_id]
      );
      await client.query(
        "UPDATE dynamic_missions SET completed_count = completed_count + 1 WHERE id = $1",
        [sub.mission_id]
      );

      await client.query("COMMIT");
      return res.json({ success: true, status: "APPROVED", missionId: sub.mission_id, userId: sub.user_id });
    }

    if (action === "rej") {
      await client.query(
        "UPDATE task_proof_submissions SET status = 'REJECTED', reviewed_by = $1, updated_at = NOW() WHERE id = $2",
        [adminId, submissionId]
      );

      await client.query("COMMIT");
      return res.json({ success: true, status: "REJECTED", missionId: sub.mission_id, userId: sub.user_id });
    }
  } catch (err) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "Resolution failed" });
  } finally {
    client.release();
  }
});

// 4. Telegraf Bot Handlers for Admin Approvals
export function registerTaskProofBotHandlers(botInstance: Telegraf) {
  botInstance.action(/^task_(appr|rej):(\d+)$/, async (ctx) => {
    const action = ctx.match[1];
    const submissionId = parseInt(ctx.match[2], 10);
    const adminUser = ctx.from?.username ? `@${ctx.from.username}` : `Admin (${ctx.from?.id})`;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const subRes = await client.query(
        `SELECT s.*, m.title, m.nc_reward, m.ton_reward 
         FROM task_proof_submissions s
         JOIN dynamic_missions m ON s.mission_id = m.id
         WHERE s.id = $1 FOR UPDATE`,
        [submissionId]
      );

      if (subRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return ctx.answerCbQuery("Submission not found", { show_alert: true });
      }

      const sub = subRes.rows[0];
      if (sub.status !== "PENDING_REVIEW") {
        await client.query("ROLLBACK");
        return ctx.answerCbQuery(`Already resolved: ${sub.status}`, { show_alert: true });
      }

      if (action === "appr") {
        // Mark approved
        await client.query(
          "UPDATE task_proof_submissions SET status = 'APPROVED', reviewed_by = $1, updated_at = NOW() WHERE id = $2",
          [ctx.from.id, submissionId]
        );

        // Record mission completion
        await client.query(
          "INSERT INTO user_mission_claims (user_id, mission_id) VALUES ($1, $2)",
          [sub.user_id, sub.mission_id]
        );

        // Credit dual balance
        await client.query(
          `UPDATE users 
           SET nc_balance = nc_balance + $1,
               ton_balance = ton_balance + $2
           WHERE id = $3`,
          [sub.nc_reward, sub.ton_reward, sub.user_id]
        );

        // Increment completed count
        await client.query(
          "UPDATE dynamic_missions SET completed_count = completed_count + 1 WHERE id = $1",
          [sub.mission_id]
        );

        // Edit channel card caption
        try {
          await ctx.editMessageCaption(
            `✅ <b>Social Task Approved</b>\n\n` +
            `👤 <b>User ID:</b> <code>${sub.user_id}</code>\n` +
            `🎯 <b>Task:</b> ${sub.title}\n` +
            `💰 <b>Awarded:</b> +${sub.nc_reward} NC | +${parseFloat(sub.ton_reward).toFixed(6)} TON\n` +
            `👮 <b>Reviewed By:</b> ${adminUser}\n` +
            `📅 <b>Resolved:</b> ${new Date().toISOString().replace("T", " ").slice(0, 16)}`,
            { parse_mode: "HTML" }
          );
        } catch (editErr) {
          console.warn("Could not edit channel caption:", editErr);
        }

        // Notify user via bot chat
        try {
          await botInstance.telegram.sendMessage(
            sub.user_id,
            `🎉 <b>Task Approved!</b>\n\n` +
            `Your proof for <b>${sub.title}</b> has been verified!\n` +
            `💰 Credited: <b>+${sub.nc_reward} NC Coins</b> and <b>+${parseFloat(sub.ton_reward).toFixed(6)} TON</b>!`,
            { parse_mode: "HTML" }
          );
        } catch (dmErr) {
          // User may not have started the bot chat yet
        }

        await client.query("COMMIT");
        return ctx.answerCbQuery("Task approved and rewards credited!");
      }

      if (action === "rej") {
        // Mark rejected
        await client.query(
          "UPDATE task_proof_submissions SET status = 'REJECTED', reviewed_by = $1, updated_at = NOW() WHERE id = $2",
          [ctx.from.id, submissionId]
        );

        // Edit channel caption
        try {
          await ctx.editMessageCaption(
            `❌ <b>Social Task Proof Rejected</b>\n\n` +
            `👤 <b>User ID:</b> <code>${sub.user_id}</code>\n` +
            `🎯 <b>Task:</b> ${sub.title}\n` +
            `👮 <b>Reviewed By:</b> ${adminUser}\n` +
            `⚠️ <b>Reason:</b> Invalid screenshot or task not completed`,
            { parse_mode: "HTML" }
          );
        } catch (editErr) {
          console.warn("Could not edit channel caption:", editErr);
        }

        // Notify user
        try {
          await botInstance.telegram.sendMessage(
            sub.user_id,
            `⚠️ <b>Task Proof Rejected</b>\n\n` +
            `Your screenshot for <b>${sub.title}</b> was rejected. Please ensure your screenshot clearly shows that you followed or subscribed, then try submitting again.`,
            { parse_mode: "HTML" }
          );
        } catch (dmErr) {
          // Ignore DM failure
        }

        await client.query("COMMIT");
        return ctx.answerCbQuery("Proof rejected.");
      }
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Bot action error:", err);
      return ctx.answerCbQuery("Failed to process action", { show_alert: true });
    } finally {
      client.release();
    }
  });
}

export default router;
