import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

const STATE_CHANGING = new Set(["POST", "PATCH", "PUT", "DELETE"]);
const SESSION_COOKIE = "sid";

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function hostOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * CSRF guard for cookie sessions: CORS alone doesn't stop a cross-site
 * form/request from carrying the session cookie, and there is no token.
 * For state-changing methods with a session cookie present, require the
 * Origin (fallback Referer) host to match the frontend host or the request
 * host. Requests with neither header (curl, mobile apps) are allowed
 * through — browsers always attach one of them on cross-site requests.
 */
export function originCheck(req: Request, res: Response, next: NextFunction): void {
  if (!STATE_CHANGING.has(req.method)) {
    next();
    return;
  }
  const cookies = headerValue(req.headers.cookie) ?? "";
  const hasSession = cookies
    .split(";")
    .some((part) => part.trim().startsWith(`${SESSION_COOKIE}=`));
  if (!hasSession) {
    next();
    return;
  }
  const sourceHost = hostOf(headerValue(req.headers.origin) ?? headerValue(req.headers.referer));
  if (!sourceHost) {
    next();
    return;
  }
  const allowed = new Set<string>();
  // Mirror the CORS default so dev (frontend :3000, backend :5000) still passes.
  const frontendHost = hostOf(env.FRONTEND_URL ?? "http://localhost:3000");
  if (frontendHost) allowed.add(frontendHost);
  const requestHost = headerValue(req.headers.host)?.toLowerCase();
  if (requestHost) allowed.add(requestHost);
  if (allowed.has(sourceHost)) {
    next();
    return;
  }
  res.status(403).json({ error: "Origin not allowed" });
}
