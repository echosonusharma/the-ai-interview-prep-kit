import { RobotsMatcher } from "google-robotstxt-parser";
import type { RobotsInfo, CrawlerConfig } from "./types.js";

const matcher = new RobotsMatcher();
const cache = new Map<string, { robotsTxt: string; fetchedAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
// Failed robots fetches fail open, but remember the failure briefly so we
// don't re-fetch robots.txt on every page of the same host.
const failedAt = new Map<string, number>();
const NEGATIVE_TTL_MS = 5 * 60 * 1000;

function parseCrawlDelay(robotsTxt: string, userAgent: string): number | undefined {
  const lines = robotsTxt.split("\n");
  let currentAgent = "";
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split(":");
    const value = rest.join(":").trim();
    const lowerKey = key.toLowerCase();
    if (lowerKey === "user-agent") {
      currentAgent = value.toLowerCase();
    } else if (lowerKey === "crawl-delay" && (currentAgent === userAgent.toLowerCase() || currentAgent === "*")) {
      const delay = parseFloat(value);
      if (!isNaN(delay) && delay > 0) return delay;
    }
  }
  return undefined;
}

function parseSitemaps(robotsTxt: string): string[] {
  const sitemaps: string[] = [];
  const lines = robotsTxt.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split(":");
    const value = rest.join(":").trim();
    if (key.toLowerCase() === "sitemap" && value) {
      sitemaps.push(value);
    }
  }
  return sitemaps;
}

function failedRecently(origin: string, now: number): boolean {
  const at = failedAt.get(origin);
  return at !== undefined && now - at < NEGATIVE_TTL_MS;
}

export async function getRobotsInfo(url: string, config: CrawlerConfig): Promise<RobotsInfo> {
  const origin = new URL(url).origin;
  const cached = cache.get(origin);
  const now = Date.now();

  let robotsTxt = "";
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    robotsTxt = cached.robotsTxt;
  } else if (!failedRecently(origin, now)) {
    try {
      const res = await fetch(`${origin}/robots.txt`, {
        headers: {
          "User-Agent": config.userAgent,
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        robotsTxt = await res.text();
        cache.set(origin, { robotsTxt, fetchedAt: now });
        failedAt.delete(origin);
      } else {
        failedAt.set(origin, now);
      }
    } catch {
      failedAt.set(origin, now);
    }
  }

  const userAgents = [config.userAgent, "*"];
  const allowed = matcher.allowedByRobots(robotsTxt, userAgents, url);

  let crawlDelay: number | undefined;
  if (config.respectCrawlDelay) {
    crawlDelay = parseCrawlDelay(robotsTxt, config.userAgent);
  }

  const sitemaps = parseSitemaps(robotsTxt);

  return { allowed, crawlDelay, sitemaps };
}

export function canCrawl(url: string, robotsTxt: string, userAgent: string): boolean {
  return matcher.oneAgentAllowedByRobots(robotsTxt, userAgent, url);
}

export function clearRobotsCache(): void {
  cache.clear();
  failedAt.clear();
}