import type { Request, Response } from "express";
import mongoose from "mongoose";

export function getHealth(_req: Request, res: Response) {
  const states: Record<number, string> = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    db: states[mongoose.connection.readyState] ?? "unknown",
  });
}

export function getRoot(_req: Request, res: Response) {
  res.json({ message: "API is running", status: "ok" });
}
