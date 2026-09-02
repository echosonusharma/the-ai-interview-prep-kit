import type { Request, Response } from "express";

export function getHealth(_req: Request, res: Response) {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
}

export function getRoot(_req: Request, res: Response) {
  res.json({ message: "API is running", status: "ok" });
}
