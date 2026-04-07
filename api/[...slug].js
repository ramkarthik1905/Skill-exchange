import "dotenv/config";
import app, { initDb } from "../server/src/app.js";

// Initialize database on first request
let initialized = false;

export default async function handler(req, res) {
  if (!initialized) {
    await initDb();
    initialized = true;
  }

  // Pass request to Express app
  app(req, res);
}
