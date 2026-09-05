import type { Request, Response } from "express";
import { User } from "../../models/user.model.js";
import { env } from "../../config/env.js";

const MIN_PASSWORD_LEN = 8;
// bcrypt only uses the first 72 bytes; longer input would be silently truncated.
const MAX_PASSWORD_LEN = 72;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function passwordError(password: string): string | null {
  if (password.length < MIN_PASSWORD_LEN) return "Password must be at least 8 characters";
  if (password.length > MAX_PASSWORD_LEN)
    return `Password must be at most ${MAX_PASSWORD_LEN} characters`;
  return null;
}

/** Regenerate the session id on login/signup so a pre-login sid can't be fixed. */
function resetSession(req: Request, userId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = userId;
      req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
    });
  });
}

export async function signup(req: Request, res: Response) {
  const { email, password, name } = req.body as { email?: string; password?: string; name?: string };

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const pwErr = passwordError(password);
  if (pwErr) {
    return res.status(400).json({ error: pwErr });
  }

  const normalized = normalizeEmail(email);
  const existing = await User.findOne({ email: normalized });
  if (existing) {
    return res.status(409).json({ error: "Email already registered" });
  }

  try {
    const user = await User.create({ email: normalized, password, name });
    await resetSession(req, user._id.toString());

    res.status(201).json({
      user: { id: user._id.toString(), email: user.email, name: user.name },
    });
  } catch (err: unknown) {
    // findOne-then-create race: unique index wins, report conflict not 500.
    if (typeof err === "object" && err !== null && "code" in err && err.code === 11000) {
      return res.status(409).json({ error: "Email already registered" });
    }
    throw err;
  }
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = await User.findOne({ email: normalizeEmail(email) }).select("+password");
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const ok = await user.comparePassword(password);
  if (!ok) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  await resetSession(req, user._id.toString());

  res.json({ user: { id: user._id.toString(), email: user.email, name: user.name } });
}

export function logout(req: Request, res: Response) {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }
    res.clearCookie("sid", {
      httpOnly: true,
      secure: env.isProd,
      sameSite: env.isProd ? "none" : "lax",
      path: "/",
    });
    res.json({ ok: true });
  });
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
