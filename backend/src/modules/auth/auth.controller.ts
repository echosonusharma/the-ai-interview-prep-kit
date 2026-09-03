import type { Request, Response } from "express";
import { User } from "../../models/user.model.js";

const COOKIE_NAME = "sid";

function setSessionCookie(res: Response, userId: string) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie(COOKIE_NAME, userId, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

function clearSessionCookie(res: Response) {
  const isProd = process.env.NODE_ENV === "production";
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
  });
}

export async function signup(req: Request, res: Response) {
  const { email, password, name } = req.body as { email?: string; password?: string; name?: string };

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const user = await User.create({ email: email.toLowerCase(), password, name });

  setSessionCookie(res, user._id.toString());

  res.status(201).json({
    user: { id: user._id.toString(), email: user.email, name: user.name },
  });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const ok = await user.comparePassword(password);
  if (!ok) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  setSessionCookie(res, user._id.toString());

  res.json({ user: { id: user._id.toString(), email: user.email, name: user.name } });
}

export function logout(_req: Request, res: Response) {
  clearSessionCookie(res);
  res.json({ ok: true });
}

export async function me(req: Request, res: Response) {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }

  res.json({ user: { id: user._id.toString(), email: user.email, name: user.name } });
}