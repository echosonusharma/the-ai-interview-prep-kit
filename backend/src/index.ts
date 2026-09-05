import app from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { startKitWorker } from "./modules/kit/kit.queue.js";

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection:", reason);
  if (env.isProd) process.exit(1);
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception:", err);
  process.exit(1);
});

async function start() {
  // Fail-fast on invalid env already handled in env.ts; now connect MongoDB
  try {
    await connectDB();
    startKitWorker();
  } catch (err) {
    logger.error("Failed to connect to MongoDB:", err);
    // In production, crash so orchestrator restarts; in dev/test allow running without DB if desired
    if (env.isProd) process.exit(1);
    logger.warn("Continuing without MongoDB (non-production). Set MONGODB_URI to enable persistence.");
  }

  const server = app.listen(env.PORT, () => {
    logger.info(`Server running on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
  });

  // Graceful shutdown — closes HTTP + MongoDB
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully...`);
    server.close(async () => {
      try {
        await disconnectDB();
      } catch (e) {
        logger.error("Error disconnecting MongoDB:", e);
      }
      process.exit(0);
    });

    // Force close if not done in 10s
    setTimeout(() => {
      logger.error("Graceful shutdown timed out — forcing exit");
      process.exit(1);
    }, 10000).unref();
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

void start();
