export interface CrawlerConfig {
  maxPages: number;
  maxDepth: number;
  requestTimeoutMs: number;
  maxContentLength: number;
  userAgent: string;
  rateLimitPerHost: number;
  respectCrawlDelay: boolean;
  minDelayMs: number;
  maxRetries: number;
  backoffBaseMs: number;
  isProd: boolean;
  /** Reuse company-site crawls younger than 24h from Mongo. Defaults on. */
  enableCache: boolean;
}

export interface CrawlResult {
  url: string;
  status: "success" | "error" | "skipped";
  content?: string;
  title?: string;
  links?: ScoredLink[];
  error?: string;
  contentType?: string;
  contentLength?: number;
  fetchedAt: string;
}

export interface ScoredLink {
  url: string;
  score: number;
  anchorText?: string;
  context?: string;
  keywords: string[];
}

export interface RobotsInfo {
  allowed: boolean;
  crawlDelay?: number;
  sitemaps?: string[];
}

export interface DiscussionHit {
  url: string;
  title: string;
  snippet: string;
  text?: string;
}

export interface CrawlerOutput {
  pages: CrawlResult[];
  baseUrl: string;
  crawledAt: string;
  robotsInfo?: RobotsInfo;
  warnings?: string[];
}

export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
  source: string;
}

export const DEFAULT_CONFIG: CrawlerConfig = {
  maxPages: 10,
  maxDepth: 2,
  requestTimeoutMs: 15000,
  maxContentLength: 2 * 1024 * 1024,
  userAgent: "PrepKitBot/1.0 (+https://github.com/prepkit)",
  rateLimitPerHost: 1,
  respectCrawlDelay: true,
  minDelayMs: 1000,
  maxRetries: 3,
  backoffBaseMs: 1000,
  // Evaluated lazily via env.isProd where used; default false so tests/local work.
  isProd: false,
  enableCache: true,
};

export function getDefaultConfig(): CrawlerConfig {
  return { ...DEFAULT_CONFIG, isProd: process.env.NODE_ENV === "production" };
}

/** Shared crawl/search settings for kit generation. */
export function kitCrawlerConfig(isProd: boolean): Partial<CrawlerConfig> {
  return { maxPages: 8, maxDepth: 2, isProd };
}

/**
 * Known applicant-tracking / job-board hosts (suffix match). Off-site links
 * to these are followed (capped) — many companies host careers entirely on
 * an ATS domain (e.g. xyz.zohorecruit.in) that same-origin crawling can
 * never reach, no matter how deep it scans.
 */
export const ATS_HOST_SUFFIXES = [
  "zohorecruit.in",
  "zohorecruit.com",
  "greenhouse.io",
  "lever.co",
  "workable.com",
  "ashbyhq.com",
  "applytojob.com",
  "breezy.hr",
  "smartrecruiters.com",
  "myworkdayjobs.com",
  "icims.com",
  "jobvite.com",
];

/** Max off-site ATS pages fetched per crawl (own budget, outside maxPages). */
export const MAX_ATS_PAGES = 2;

/**
 * Same-site paths worth probing when the homepage links to no careers page
 * and no ATS link is found (e.g. JS-rendered nav hides them from static HTML).
 */
export const CAREER_PATH_PROBES = ["/careers", "/jobs", "/join-us"];

/**
 * Keyword hits that count as a careers signal (suppresses path probing).
 * Checked against matched keywords, not raw scores — parent-context bleed
 * can inflate a blog link's score without any hiring relevance.
 */
export const CAREER_SIGNAL_KEYWORDS = new Set([
  "careers",
  "jobs",
  "hiring",
  "join",
  "work-with-us",
  "work-at",
  "how-we-hire",
  "recruiting",
  "talent",
]);

export const HIRING_KEYWORDS = [
  { keyword: "careers", weight: 10 },
  { keyword: "jobs", weight: 9 },
  { keyword: "hiring", weight: 9 },
  { keyword: "join", weight: 7 },
  { keyword: "work-with-us", weight: 8 },
  { keyword: "work-at", weight: 8 },
  { keyword: "team", weight: 4 },
  { keyword: "about", weight: 3 },
  { keyword: "company", weight: 3 },
  { keyword: "culture", weight: 5 },
  { keyword: "values", weight: 4 },
  { keyword: "handbook", weight: 7 },
  { keyword: "engineering", weight: 5 },
  { keyword: "blog", weight: 4 },
  { keyword: "interview", weight: 8 },
  { keyword: "process", weight: 4 },
  { keyword: "how-we-hire", weight: 9 },
  { keyword: "recruiting", weight: 6 },
  { keyword: "talent", weight: 5 },
  { keyword: "people", weight: 3 },
  { keyword: "life-at", weight: 6 },
  { keyword: "benefits", weight: 3 },
  { keyword: "diversity", weight: 3 },
  { keyword: "inclusion", weight: 3 },
];

export const EXCLUDE_PATTERNS = [
  /\/login/,
  /\/signup/,
  /\/signin/,
  /\/register/,
  /\/cart/,
  /\/checkout/,
  /\/account/,
  /\/profile/,
  /\/settings/,
  /\/admin/,
  /\/api\//,
  /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|exe|dmg|pkg|iso|img)$/i,
  /\.(jpg|jpeg|png|gif|webp|svg|ico|woff|woff2|ttf|eot)$/i,
  /\.(css|js|map)$/i,
  /#/,
  /\?.*utm_/,
];