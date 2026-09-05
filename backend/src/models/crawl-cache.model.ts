import mongoose, { Schema, Model } from "mongoose";
import { env } from "../config/env.js";
import type { CrawlerOutput } from "../crawler/types.js";
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

crawlCacheSchema.index(
  { crawledAt: 1 },
  { expireAfterSeconds: Math.round(env.CRAWL_CACHE_TTL_HOURS * 3600) }
);

export const CrawlCache: Model<ICrawlCache> =
  (mongoose.models.CrawlCache as Model<ICrawlCache> | undefined) ??
  mongoose.model<ICrawlCache>("CrawlCache", crawlCacheSchema);
