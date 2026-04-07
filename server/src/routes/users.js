import express from "express";
import User from "../models/User.js";
import Skill from "../models/Skill.js";
import { requireAuth } from "../middleware/auth.js";

function skillIdsFromEntries(entries) {
  const ids = new Set();
  for (const e of entries || []) {
    const sid = e.skill?._id ?? e.skill;
    if (sid) ids.add(String(sid));
  }
  return ids;
}

const router = express.Router();

router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate("skillsOffered.skill")
    .populate("skillsWanted.skill")
    .select("-passwordHash");
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json(user);
});

router.patch("/me", requireAuth, async (req, res) => {
  const prev =
    req.body.skillsOffered !== undefined || req.body.skillsWanted !== undefined
      ? await User.findById(req.user._id).select("skillsOffered.skill skillsWanted.skill").lean()
      : null;

  const allowed = [
    "name",
    "headline",
    "bio",
    "timezone",
    "linkedInUrl",
    "location",
    "weeklyAvailability",
    "skillsOffered",
    "skillsWanted",
  ];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true })
    .populate("skillsOffered.skill")
    .populate("skillsWanted.skill")
    .select("-passwordHash");

  if (prev && user) {
    const before = new Set([
      ...skillIdsFromEntries(prev.skillsOffered),
      ...skillIdsFromEntries(prev.skillsWanted),
    ]);
    const after = new Set([
      ...skillIdsFromEntries(user.skillsOffered),
      ...skillIdsFromEntries(user.skillsWanted),
    ]);
    const added = [...after].filter((id) => !before.has(id));
    for (const id of added) {
      await Skill.updateOne({ _id: id }, { $inc: { popularityScore: 1 } }).catch(() => {});
    }
  }

  res.json(user);
});

export default router;
