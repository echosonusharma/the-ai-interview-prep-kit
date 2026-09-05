import mongoose from "mongoose";
import { env } from "../config/env.js";
import { CrawlCache } from "../models/crawl-cache.model.js";
import type { CrawlerOutput } from "./types.js";
import { logger } from "../utils/logger.js";

/** Company-site crawl results are reused for this long (env-overridable). */
export const CRAWL_CACHE_TTL_MS = env.CRAWL_CACHE_TTL_HOURS * 60 * 60 * 1000;

/**
 * Root domain for a URL: `careers.xyz.com` → `xyz.com`. Subdomains share one
 * cache entry because a company-site crawl is per company, not per page.
 * IPs and localhost pass through unchanged. Multi-part public suffixes
 * (`xyz.co.uk` → `co.uk`) are a known limitation of the last-two-labels rule.
 */
export function rootDomain(rawUrl: string): string | null {
  let host: string;
  try {
    host = new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (host.endsWith(".")) host = host.slice(0, -1);
  if (!host) return null;
  if (host === "localhost" || host.includes(":") || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return host;
  const parts = host.split(".").filter(Boolean);
  if (parts.length <= 2) return host;
  return parts.slice(-2).join(".");
}

/** Cache key for a crawl — the root domain (e.g. "xyz.com"). */
export function crawlCacheKey(baseUrl: string): string | null {
  return rootDomain(baseUrl);
}

function cacheUsable(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function getCachedCrawl(key: string): Promise<CrawlerOutput | null> {
  try {
    if (!cacheUsable()) return null;
    const doc = await CrawlCache.findOne({ key }).lean();
    if (!doc) return null;
    const age = Date.now() - new Date(doc.crawledAt).getTime();
    if (!Number.isFinite(age) || age < 0 || age >= CRAWL_CACHE_TTL_MS) return null;
    return doc.output as CrawlerOutput;
  } catch {
    return null; // cache never breaks a crawl
  }
}

export async function setCachedCrawl(key: string, baseUrl: string, output: CrawlerOutput): Promise<void> {
  try {
    if (!cacheUsable()) return;
    await CrawlCache.updateOne(
      { key },
      { $set: { baseUrl, output, crawledAt: new Date(output.crawledAt) } },
      { upsert: true }
    );
  } catch (error) {
    logger.error("failed to cache crawl", error)
  }
}

export async function clearCrawlCache(): Promise<void> {
  try {
    if (cacheUsable()) await CrawlCache.deleteMany({});
  } catch (error) {
    logger.info("failed to clear crawl cache", error)
  }
}
