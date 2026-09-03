import type { CrawlerConfig } from "./types.js";

const PRIVATE_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^127\./,
  /^169\.254\./,
  /^::1$/,
  /^fe80::/i,
  /^fc00:/i,
  /^fd00:/i,
];

const BLOCKED_HOSTS = ["localhost", "localhost.localdomain", "0.0.0.0"];

export function validateUrl(url: string, config: CrawlerConfig): { valid: boolean; error?: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { valid: false, error: "Only HTTP/HTTPS protocols allowed" };
  }

  if (config.isProd && parsed.protocol === "http:") {
    return { valid: false, error: "HTTP not allowed in production" };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.includes(hostname)) {
    return { valid: false, error: "Blocked hostname" };
  }

  const ip = hostname.match(/^(\d{1,3}\.){3}\d{1,3}$/) ? hostname : null;
  if (ip && PRIVATE_IP_RANGES.some((r) => r.test(ip))) {
    return { valid: false, error: "Private IP addresses not allowed" };
  }

  return { valid: true };
}

export function normalizeUrl(base: string, href: string): string | null {
  try {
    const url = new URL(href, base);
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function sameOrigin(url1: string, url2: string): boolean {
  try {
    const u1 = new URL(url1);
    const u2 = new URL(url2);
    return u1.origin === u2.origin;
  } catch {
    return false;
  }
}

export function isAllowedByPatterns(url: string, excludePatterns: RegExp[]): boolean {
  return !excludePatterns.some((p) => p.test(url));
}