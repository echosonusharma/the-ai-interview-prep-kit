import * as cheerio from "cheerio";
import { normalizeUrl, sameOrigin, isAllowedByPatterns } from "./url-validator.js";
import type { ScoredLink, CrawlerConfig } from "./types.js";
import { HIRING_KEYWORDS, EXCLUDE_PATTERNS } from "./types.js";

// Unscored links kept per page when nothing scores (keeps odd hiring pages reachable).
const FALLBACK_UNSCRED_LIMIT = 5;

function scoreLink(
  href: string,
  anchorText: string,
  context: string,
  baseUrl: string
): { score: number; keywords: string[] } {
  const text = `${href} ${anchorText} ${context}`.toLowerCase();
  let score = 0;
  const matchedKeywords: string[] = [];

  for (const { keyword, weight } of HIRING_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) {
      score += weight;
      matchedKeywords.push(keyword);
    }
  }

  if (href === baseUrl || href === baseUrl + "/") score += 5;
  if (href.endsWith("/")) score += 1;

  return { score, keywords: matchedKeywords };
}

export function extractLinks(
  html: string,
  baseUrl: string,
  config: CrawlerConfig
): ScoredLink[] {
  const $ = cheerio.load(html);
  const links: ScoredLink[] = [];
  const fallback: ScoredLink[] = [];
  const seen = new Set<string>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    const absolute = normalizeUrl(baseUrl, href);
    if (!absolute) return;
    if (seen.has(absolute)) return;
    if (!sameOrigin(absolute, baseUrl)) return;
    if (!isAllowedByPatterns(absolute, EXCLUDE_PATTERNS)) return;

    seen.add(absolute);

    const anchorText = $(el).text().trim().slice(0, 200);
    const context = $(el).parent().text().trim().slice(0, 300);

    const { score, keywords } = scoreLink(absolute, anchorText, context, baseUrl);

    if (score > 0 || absolute === baseUrl) {
      links.push({ url: absolute, score, anchorText, context, keywords });
    } else if (fallback.length < FALLBACK_UNSCRED_LIMIT) {
      fallback.push({ url: absolute, score, anchorText, context, keywords });
    }
  });

  // Unusually-worded hiring pages may score nothing — keep a few unscored
  // same-origin links so they stay reachable instead of dropping the page.
  const kept = links.length > 0 ? links : fallback;
  kept.sort((a, b) => b.score - a.score);
  return kept;
}

export function getTopLinks(links: ScoredLink[], max: number): ScoredLink[] {
  return links.slice(0, max);
}