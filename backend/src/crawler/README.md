# Crawler Package

## Overview

Crawls company websites to discover hiring-related pages and extract clean content. Used by the kit generation pipeline for company research.

## How It Works

1. **Fetch homepage** - Respects robots.txt, rate limits per host
2. **Follow ATS careers links** - Off-site links to known job-board hosts (Zoho Recruit, Greenhouse, Lever, Workable, Ashby, …) are fetched under their own cap (`MAX_ATS_PAGES = 2`); same-origin crawling can never reach them
3. **Extract & score links** - Cheerio parses HTML, scores all same-origin links by keyword relevance (29 weighted keywords: careers=10, jobs=9, hiring=9, handbook=7, interview=8, etc.)
4. **Probe career paths** - When the homepage shows no careers signal and no ATS link, `/careers`, `/jobs`, `/join-us` jump the queue (404s expected, never warned)
5. **Crawl top-N pages** - Breadth-first up to `maxDepth` (default 2), `maxPages` (default 10, 8 for kits)
6. **Extract content** - Removes nav/footer/scripts/ads, targets main content areas
7. **Return structured results** - Each page: URL, status, title, cleaned text, metadata

## Usage

```typescript
import { crawlCompanySite, enrichPublicDiscussion } from "./crawler/index.js";
import { kitCrawlerConfig } from "./crawler/types.js";

const cfg = kitCrawlerConfig(process.env.NODE_ENV === "production");
const crawl = await crawlCompanySite("https://company.com", cfg);
const discussion = await enrichPublicDiscussion("Company Name", "https://company.com", cfg);
// discussion.warnings — non-fatal search/fetch issues
```

## Configuration

```typescript
interface CrawlerConfig {
  maxPages: 10;           // max pages to fetch
  maxDepth: 2;            // crawl depth from homepage
  requestTimeoutMs: 15000;
  maxContentLength: 2MB;
  userAgent: "PrepKitBot/1.0";
  rateLimitPerHost: 1;    // req/sec per hostname
  respectCrawlDelay: true; // honors robots.txt Crawl-delay
  minDelayMs: 1000;
  maxRetries: 3;
  backoffBaseMs: 1000;
  isProd: boolean;        // blocks HTTP in production
  enableCache: true;      // reuse Mongo-cached crawls younger than 24h
}
```

## Crawl cache (Mongo, 24h)

`crawlCompanySite` caches successful company-site crawls in the `crawl_cache`
collection (schema: `src/models/crawl-cache.model.ts`, helpers:
`src/crawler/cache.ts`). Key = root domain (`careers.xyz.com` → `xyz.com`),
so all pages/paths of one company share a single entry. Rows carry a TTL
index (`CRAWL_CACHE_TTL_HOURS`, default 24) and every read re-checks age, so
stale rows are never served even if the TTL sweep lags.

- Best-effort: with no Mongo connection (tests, local scripts) the cache is
  skipped silently. Cache errors never fail a crawl.
- Total failures (zero successful pages) are not cached.
- Opt out per call with `{ enableCache: false }`; clear in tests with
  `clearCrawlCache()`.
- Public-discussion search (`enrichPublicDiscussion`) is not cached.
- Changing `CRAWL_CACHE_TTL_HOURS` requires dropping the old `crawledAt_1`
  index so it is rebuilt with the new expiry.

## Security

- Blocks private IPs (10.x, 172.16-31.x, 192.168.x, 127.x, link-local)
- Blocks localhost, 0.0.0.0
- Enforces HTTPS in production
- Re-validates redirect targets in production (blocks SSRF via `redirect: follow`)
- Public discussion fetches use the same `isProd` rules as site crawl
- Validates content-type (HTML only)
- Enforces 2MB content limit

## Limitations

| Limitation | Details |
|------------|---------|
| **SPA/Client-side routing** | Cannot discover pages rendered by JS (e.g., MongoDB, Figma return only homepage) |
| **No JavaScript execution** | Static HTML only; dynamic content missed |
| **Rate limiting** | Conservative (1 req/sec/host) to be polite; slow for large sites |
| **Depth limit** | Default maxDepth=2; deep pages not reached |
| **Keyword-based scoring** | Heuristic; may miss pages with unconventional naming |
| **Public discussion search** | Bing RSS primary, DuckDuckGo HTML fallback; no API key, relevance varies for small firms |
| **No sitemap.xml parsing** | Could improve discovery; currently only follows links |
| **Single-threaded** | Sequential per-host; no parallel fetch across hosts |
| **No login/auth** | Cannot access protected pages |

## Run Tests

```bash
npm run test:crawler
```

Tests 35 companies across 9 categories (major tech, SaaS, infra, auth, email, job boards, ATS).