import type { Request, Response, NextFunction } from "express";

type AppError = Error & { statusCode?: number; status?: number };

export function errorHandler(err: AppError, _req: Request, res: Response, _next: NextFunction) {
  console.error(err.stack ?? err);

  // Never leak driver/ORM internals to clients — map known shapes to clean codes.
  const name = err.name ?? "";
  const code = (err as { code?: unknown }).code;
  if (name === "ValidationError") {
    return res.status(400).json({ error: "Invalid request data" });
  }
  if (name === "VersionError") {
    return res.status(409).json({ error: "Kit changed elsewhere, reload and retry" });
  }
  if (code === 11000) {
    return res.status(409).json({ error: "Resource already exists" });
  }
  if (name === "CastError") {
    return res.status(400).json({ error: "Invalid id" });
  }

  const status = err.statusCode ?? err.status ?? 500;
  const message = status === 500 || !err.message ? "Internal Server Error" : err.message;
  res.status(status).json({ error: message });
}
