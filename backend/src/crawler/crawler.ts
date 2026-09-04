import * as cheerio from "cheerio";
import type { CrawlerConfig, CrawlResult, CrawlerOutput, DiscussionHit } from "./types.js";
import { DEFAULT_CONFIG } from "./types.js";
import { fetchPage } from "./fetcher.js";
import { extractLinks, getTopLinks } from "./link-extractor.js";
import { extractContent } from "./content-extractor.js";
import { normalizeOutboundUrl, validateUrl } from "./url-validator.js";

interface CrawlQueueItem {
  url: string;
  depth: number;
  score: number;
}

export type { DiscussionHit };

export interface DiscussionSearchResult {
  query: string;
  results: DiscussionHit[];
  warnings: string[];
}

export async function crawlCompanySite(
  baseUrl: string,
  userConfig: Partial<CrawlerConfig> = {}
): Promise<CrawlerOutput> {
  const config = { ...DEFAULT_CONFIG, ...userConfig };
  const warnings: string[] = [];
  const validation = validateUrl(baseUrl, config);
  if (!validation.valid) {
    return {
      pages: [],
      baseUrl,
      crawledAt: new Date().toISOString(),
      robotsInfo: { allowed: false },
      warnings: [`Invalid base URL: ${validation.error}`],
    };
  }

  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
  const results: CrawlResult[] = [];
  const queue: CrawlQueueItem[] = [];
  const visited = new Set<string>([normalizedBase]);

  const homepageResult = await fetchPage(normalizedBase, config);
  results.push(homepageResult);

  if (homepageResult.status === "success" && homepageResult.content) {
    const links = extractLinks(homepageResult.content, normalizedBase, config);
    const topLinks = getTopLinks(links, config.maxPages - 1);

    for (const link of topLinks) {
      if (!visited.has(link.url)) queue.push({ url: link.url, depth: 1, score: link.score });
    }
  } else if (homepageResult.error) {
    warnings.push(`Homepage: ${homepageResult.error}`);
  }

  while (queue.length > 0 && results.length < config.maxPages) {
    queue.sort((a, b) => b.score - a.score);
    const item = queue.shift()!;
    if (visited.has(item.url)) continue;
    if (item.depth > config.maxDepth) continue;

    visited.add(item.url);

    const result = await fetchPage(item.url, config);
    results.push(result);

    if (result.error) {
      warnings.push(`${item.url}: ${result.error}`);
    }

    if (result.status === "success" && result.content && item.depth < config.maxDepth) {
      const links = extractLinks(result.content, normalizedBase, config);
      const topLinks = getTopLinks(links, Math.max(1, config.maxPages - results.length));

      for (const link of topLinks) {
        if (!visited.has(link.url)) {
          queue.push({ url: link.url, depth: item.depth + 1, score: link.score });
        }
      }
    }
  }

  const enrichedResults = results.map((r) => {
    if (r.status === "success" && r.content) {
      const { title, text } = extractContent(r.content, r.url);
      return { ...r, title, content: text };
    }
    return r;
  });

  return {
    pages: enrichedResults,
    baseUrl: normalizedBase,
    crawledAt: new Date().toISOString(),
    warnings: warnings.length ? warnings : undefined,
  };
}

const SEARCH_QUERIES = (companyName: string) => [
  `"${companyName}" interview`,
  `"${companyName}" interview process`,
  `"${companyName}" hiring process`,
  `"${companyName}" reviews`,
  `"${companyName}" engineering culture`,
  `site:glassdoor.com "${companyName}"`,
  `site:reddit.com "${companyName}" interview`,
  `site:levels.fyi "${companyName}"`,
];

export async function searchPublicDiscussion(
  companyName: string,
  _companyUrl: string,
  config: CrawlerConfig = DEFAULT_CONFIG
): Promise<DiscussionSearchResult> {
  const warnings: string[] = [];
  const queries = SEARCH_QUERIES(companyName);
  const seen = new Set<string>();
  const results: DiscussionHit[] = [];
  let queriesFailed = 0;

  for (const query of queries) {
    try {
      const hits = await simpleWebSearch(query, config);
      if (hits.length === 0) continue;

      for (const hit of hits) {
        const key = hit.url.replace(/#.*$/, "").replace(/\/$/, "");
        if (seen.has(key)) continue;
        seen.add(key);
        results.push(hit);
        if (results.length >= 12) break;
      }
      if (results.length >= 12) break;
    } catch (e) {
      queriesFailed += 1;
      if (queriesFailed === 1) {
        warnings.push(
          `Public search query failed: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }
  }

  if (results.length === 0) {
    if (queriesFailed > 0) {
      warnings.push(`Public search failed for ${queriesFailed}/${queries.length} queries`);
    } else {
      warnings.push("Public search returned no results");
    }
  }

  return { query: companyName, results: results.slice(0, 12), warnings };
}

/** Fetch readable text from top public discussion/review URLs. */
export async function enrichPublicDiscussion(
  companyName: string,
  companyUrl: string,
  userConfig: Partial<CrawlerConfig> = {}
): Promise<DiscussionSearchResult> {
  const config = { ...DEFAULT_CONFIG, ...userConfig };
  const search = await searchPublicDiscussion(companyName, companyUrl, config);
  const warnings = [...search.warnings];
  const enriched: DiscussionHit[] = [];

  let fetched = 0;
  for (const hit of search.results) {
    if (fetched >= 3) {
      enriched.push(hit);
      continue;
    }
    const validation = validateUrl(hit.url, config);
    if (!validation.valid) {
      enriched.push(hit);
      continue;
    }
    try {
      const page = await fetchPage(hit.url, config);
      if (page.status === "success" && page.content) {
        const { text } = extractContent(page.content, hit.url);
        const body = text.replace(/\s+/g, " ").trim().slice(0, 2000);
        enriched.push(body.length > 80 ? { ...hit, text: body } : hit);
        if (body.length > 80) fetched += 1;
      } else {
        enriched.push(hit);
      }
    } catch (e) {
      enriched.push(hit);
      if (fetched === 0 && enriched.length === 1) {
        warnings.push(
          `Could not fetch public discussion page: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }
  }

  return { query: search.query, results: enriched, warnings };
}

async function simpleWebSearch(
  query: string,
  config: CrawlerConfig
): Promise<Array<{ url: string; title: string; snippet: string }>> {
  const encoded = encodeURIComponent(query);
  const url = `https://html.duckduckgo.com/html/?q=${encoded}`;

  const res = await fetch(url, {
    headers: { "User-Agent": config.userAgent },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    throw new Error(`DuckDuckGo HTTP ${res.status}`);
  }
  const html = await res.text();
  return parseSearchResults(html, config);
}

function parseSearchResults(
  html: string,
  config: CrawlerConfig
): Array<{ url: string; title: string; snippet: string }> {
  const $ = cheerio.load(html);
  const results: Array<{ url: string; title: string; snippet: string }> = [];

  const containers = $(".result, .results_links, .web-result");
  if (containers.length > 0) {
    containers.each((_, el) => {
      const $el = $(el);
      const $titleA = $el.find(".result__title a, .result__a, a.result__url").first();
      const title = $titleA.text().trim() || $el.find(".result__title").first().text().trim();
      const rawUrl = $titleA.attr("href")?.trim() ?? $el.find(".result__url").first().text().trim();
      const url = rawUrl ? normalizeOutboundUrl(rawUrl) : null;
      const snippet = $el.find(".result__snippet").first().text().trim();
      if (title && url && validateUrl(url, config).valid) {
        results.push({ url, title, snippet });
      }
    });
  } else {
    $("a.result__url, a.result__a").each((_, el) => {
      const $el = $(el);
      const title = $el.text().trim();
      const rawUrl = $el.attr("href")?.trim() ?? "";
      const url = rawUrl ? normalizeOutboundUrl(rawUrl) : null;
      const snippet = $el.closest(".result").find(".result__snippet").first().text().trim();
      if (title && url && validateUrl(url, config).valid) {
        results.push({ url, title, snippet });
      }
    });
  }

  return results.slice(0, 10);
}
