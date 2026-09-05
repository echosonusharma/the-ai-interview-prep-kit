import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import session from "express-session";
import MongoStore from "connect-mongo";
import healthRouter from "./modules/health/health.routes.js";
import authRouter from "./modules/auth/auth.routes.js";
import kitRouter from "./modules/kit/kit.routes.js";
import { getRoot } from "./modules/health/health.controller.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { originCheck } from "./middleware/originCheck.js";
import { env } from "./config/env.js";

export function createApp() {
  const app = express();

  // Behind a proxy (Render/Railway/etc) so secure cookies + req.ip work.
  app.set("trust proxy", 1);

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
  // JSON only — no urlencoded parser, so cross-site form POSTs can't
  // smuggle state-changing requests past the JSON body check.
  app.use(express.json({ limit: "1mb" }));

  // Session (7-day sliding window: rolling refresh keeps active users logged
  // in, maxAge stays the absolute ceiling between requests)
  const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
  app.use(
    session({
      name: "sid",
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        secure: env.isProd,
        // "none" is required while frontend/backend are cross-site;
        // CSRF surface is narrowed by CORS allowlisting + JSON-only bodies
        // + the origin check on /api state-changing routes.
        sameSite: env.isProd ? "none" : "lax",
        maxAge: SESSION_TTL_MS,
        path: "/",
      },
      store: MongoStore.create({
        mongoUrl: env.MONGODB_URI,
        collectionName: "sessions",
        ttl: 7 * 24 * 60 * 60,
      }),
    })
  );

  

  // CSRF: state-changing /api requests with a session cookie must carry a
  // matching Origin/Referer (see middleware/originCheck.ts).
  app.use("/api", originCheck);

  // Routes
  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/kits", kitRouter);
  app.get("/", getRoot);

  // 404 + error
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

const app = createApp();
export default app;
