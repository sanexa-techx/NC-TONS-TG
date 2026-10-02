// backend/src/routes/membership.ts
import { Router } from "express";
import { checkUserMembership } from "../services/membership.js";

const router = Router();

// GET /api/membership/status?userId=123456789
router.get("/status", async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const status = await checkUserMembership(Number(userId));
    return res.json(status);
  } catch (err) {
    console.error("Membership check route failed:", err);
    return res.status(500).json({ error: "Failed to verify membership" });
  }
});

export default router;
