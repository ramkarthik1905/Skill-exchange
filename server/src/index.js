import "dotenv/config";
import app, { initDb } from "./app.js";

const port = process.env.PORT || 5050;

console.log(`🚀 Starting Skill Exchange Server...`);
console.log(`📍 Connecting to MongoDB...`);

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`🎉 Skill Exchange API running on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  });
