import mongoose, { Schema, Model } from "mongoose";
import { env } from "../config/env.js";
import type { CrawlerOutput } from "../crawler/types.js";

/** One cached company-site crawl, keyed by root domain (e.g. "xyz.com"). */
export interface ICrawlCache {
  key: string;
  baseUrl: string;
  output: CrawlerOutput;
  crawledAt: Date;
}

const crawlCacheSchema = new Schema<ICrawlCache>(
  {
    key: { type: String, required: true, unique: true },
    baseUrl: { type: String, required: true },
    output: { type: Schema.Types.Mixed, required: true },
    crawledAt: { type: Date, required: true },
  },
  { timestamps: true, collection: "crawl_cache" }
);

// NOTE: the expiry is baked into the Mongo index when it is first created.
// Changing CRAWL_CACHE_TTL_HOURS later requires dropping the old
// `crawledAt_1` index so it is rebuilt; reads additionally check age
// manually (see src/crawler/cache.ts), so a stale index can only delay
// cleanup, never serve stale rows.
crawlCacheSchema.index(
  { crawledAt: 1 },
  { expireAfterSeconds: Math.round(env.CRAWL_CACHE_TTL_HOURS * 3600) }
);

export const CrawlCache: Model<ICrawlCache> =
  (mongoose.models.CrawlCache as Model<ICrawlCache> | undefined) ??
  mongoose.model<ICrawlCache>("CrawlCache", crawlCacheSchema);
