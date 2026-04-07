import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { findMatchesForUser } from "../services/matchingService.js";

const router = express.Router();

router.get("/me", requireAuth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const result = await findMatchesForUser(req.user._id, { limit });
    res.json(result);
  } catch (err) {
    if (err.message === "User not found") {
      return res.status(404).json({ error: "User not found" });
    }
    console.error(err);
    res.status(500).json({ error: "Matching failed" });
  }
});

export default router;
