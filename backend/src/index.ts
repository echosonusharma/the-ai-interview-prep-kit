import app from "./app.js";
import { env } from "./config/env.js";
import { connectDB, disconnectDB } from "./config/db.js";

async function start() {
  // Fail-fast on invalid env already handled in env.ts; now connect MongoDB
  try {
    await connectDB();
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    // In production, crash so orchestrator restarts; in dev/test allow running without DB if desired
    if (env.isProd) process.exit(1);
    console.warn("Continuing without MongoDB (non-production). Set MONGODB_URI to enable persistence.");
  }

  const server = app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
  });

  // Graceful shutdown — closes HTTP + MongoDB
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down gracefully...`);
    server.close(async () => {
      try {
        await disconnectDB();
      } catch (e) {
        console.error("Error disconnecting MongoDB:", e);
      }
      process.exit(0);
    });

    // Force close if not done in 10s
    setTimeout(() => {
      console.error("Graceful shutdown timed out — forcing exit");
      process.exit(1);
    }, 10000).unref();
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

void start();
