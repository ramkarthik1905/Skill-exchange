import express from "express";
import mongoose from "mongoose";
import Skill from "../models/Skill.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** GET /api/skills/categories */
router.get("/categories", async (_req, res) => {
  try {
    const categories = await Skill.distinct("category");
    res.json(categories.sort((a, b) => a.localeCompare(b)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load categories" });
  }
});

/** GET /api/skills?q=&category=&tag=&sort=name|popular|recent&limit=&skip= */
router.get("/", async (req, res) => {
  try {
    const { q, category, tag, sort = "name", limit = "100", skip = "0" } = req.query;
    const filter = {};
    if (category && String(category).trim()) {
      filter.category = new RegExp(`^${String(category).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    }
    if (tag && String(tag).trim()) {
      filter.tags = String(tag).trim().toLowerCase();
    }
    if (q && String(q).trim()) {
      const rx = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ name: rx }, { description: rx }, { tags: rx }, { category: rx }];
    }

    const lim = Math.min(Math.max(Number.parseInt(limit, 10) || 100, 1), 200);
    const sk = Math.max(Number.parseInt(skip, 10) || 0, 0);

    let sortSpec = { name: 1 };
    if (sort === "popular") sortSpec = { popularityScore: -1, name: 1 };
    else if (sort === "recent") sortSpec = { createdAt: -1, name: 1 };

    const [items, total] = await Promise.all([
      Skill.find(filter).sort(sortSpec).skip(sk).limit(lim).lean(),
      Skill.countDocuments(filter),
    ]);

    res.json({ items, total, limit: lim, skip: sk });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not list skills" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { name, category, description, tags } = req.body;
    if (!name || !category) {
      return res.status(400).json({ error: "name and category required" });
    }
    let slug = slugify(name);
    const exists = await Skill.findOne({ slug });
    if (exists) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }
    const tagList = Array.isArray(tags) ? tags : typeof tags === "string" ? tags.split(",").map((t) => t.trim()) : [];
    const skill = await Skill.create({
      name: name.trim(),
      slug,
      category: category.trim(),
      description: description || "",
      tags: tagList.filter(Boolean).map((t) => String(t).toLowerCase()),
      contributedBy: req.user._id,
    });
    res.status(201).json(skill);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not create skill" });
  }
});

/** GET /api/skills/:idOrSlug */
router.get("/:idOrSlug", async (req, res) => {
  try {
    const key = req.params.idOrSlug;
    let skill = null;
    if (mongoose.Types.ObjectId.isValid(key) && String(new mongoose.Types.ObjectId(key)) === key) {
      skill = await Skill.findById(key).populate("contributedBy", "name headline").lean();
    }
    if (!skill) {
      skill = await Skill.findOne({ slug: String(key).toLowerCase() })
        .populate("contributedBy", "name headline")
        .lean();
    }
    if (!skill) {
      return res.status(404).json({ error: "Skill not found" });
    }

    const sid = skill._id;
    const [offeringCount, wantingCount] = await Promise.all([
      User.countDocuments({ "skillsOffered.skill": sid, isActive: true }),
      User.countDocuments({ "skillsWanted.skill": sid, isActive: true }),
    ]);

    res.json({
      ...skill,
      stats: { offeringCount, wantingCount },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load skill" });
  }
});

export default router;
