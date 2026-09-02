import type { Request, Response, NextFunction } from "express";

type AppError = Error & { statusCode?: number; status?: number };

export function errorHandler(err: AppError, _req: Request, res: Response, _next: NextFunction) {
  console.error(err.stack);
  const status = err.statusCode ?? err.status ?? 500;
  const message = status === 500 || !err.message ? "Internal Server Error" : err.message;
  res.status(status).json({ error: message });
}
