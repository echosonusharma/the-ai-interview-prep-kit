import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import healthRouter from "./modules/health/health.routes.js";
import { getRoot } from "./modules/health/health.controller.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { env } from "./config/env.js";

export function createApp() {
  const app = express();

  // Security & core middleware
  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_URL ?? "http://localhost:3000",
      credentials: true,
    })
  );
  if (!env.isProd) {
    app.use(morgan("dev"));
  }
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  // Routes
  app.use("/api/health", healthRouter);
  app.get("/", getRoot);

  // 404 + error
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

const app = createApp();
export default app;
