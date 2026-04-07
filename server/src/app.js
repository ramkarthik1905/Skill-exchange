import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import skillRoutes from "./routes/skills.js";
import exchangeRoutes from "./routes/exchanges.js";
import reviewRoutes from "./routes/reviews.js";
import matchRoutes from "./routes/match.js";
import { seedSkillsIfEmpty } from "./seedSkills.js";
import { seedSampleDataIfEmpty } from "./seedData.js";

const app = express();
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
app.use(cors({ origin: clientUrl, credentials: true }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/exchanges", exchangeRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/match", matchRoutes);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Initialize database connection
let mongoConnected = false;

export async function initDb() {
  if (mongoConnected) return;
  const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/skill_exchange";
  
  try {
    await mongoose.connect(mongoUri);
    mongoConnected = true;
    console.log(`✅ MongoDB connected`);
    console.log(`🌱 Seeding skills...`);
    await seedSkillsIfEmpty();
    console.log(`🌱 Seeding sample data...`);
    await seedSampleDataIfEmpty();
    console.log(`✅ Database seeding completed`);
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    throw err;
  }
}

export default app;
