import * as cheerio from "cheerio";
import type { CrawlerConfig, CrawlResult, CrawlerOutput, DiscussionHit } from "./types.js";
import { DEFAULT_CONFIG, MAX_ATS_PAGES, CAREER_PATH_PROBES, CAREER_SIGNAL_KEYWORDS } from "./types.js";
import { getCachedCrawl, setCachedCrawl, crawlCacheKey } from "./cache.js";
import { fetchPage } from "./fetcher.js";
import { extractLinks, extractAtsLinks, getTopLinks } from "./link-extractor.js";
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

  const cacheKey = config.enableCache ? crawlCacheKey(normalizedBase) : null;
  if (cacheKey) {
    const cached = await getCachedCrawl(cacheKey);
    if (cached) return cached;
  }

  const results: CrawlResult[] = [];
  const queue: CrawlQueueItem[] = [];
  const visited = new Set<string>([normalizedBase]);

  const homepageResult = await fetchPage(normalizedBase, config);
  results.push(homepageResult);

  // Off-site ATS careers pages (e.g. xyz.zohorecruit.in) — fetched after the
  // main loop under their own small budget. Fetched via fetchPage, so the
  // usual SSRF guards (validateUrl, DNS checks) still apply.
  let atsUrls: string[] = [];
  // Speculative same-site probes — 404s are expected, never warned about.
  const probeUrls = new Set<string>();

  if (homepageResult.status === "success" && homepageResult.content) {
    const links = extractLinks(homepageResult.content, normalizedBase, config);
    const topLinks = getTopLinks(links, config.maxPages - 1);

    for (const link of topLinks) {
      if (!visited.has(link.url)) queue.push({ url: link.url, depth: 1, score: link.score });
    }

    atsUrls = extractAtsLinks(homepageResult.content, normalizedBase)
      .slice(0, MAX_ATS_PAGES)
      .map((l) => l.url);

    // No careers signal on the homepage (JS-rendered nav, odd wording) and
    // no ATS link either — probe the usual paths first, inside the page budget.
    const hasCareerSignal =
      atsUrls.length > 0 ||
      links.some((l) => l.keywords.some((k) => CAREER_SIGNAL_KEYWORDS.has(k)));
    if (!hasCareerSignal) {
      for (const path of CAREER_PATH_PROBES) {
        let probe: string;
        try {
          probe = new URL(path, normalizedBase).toString();
        } catch {
          continue;
        }
        if (!visited.has(probe)) {
          probeUrls.add(probe);
          queue.push({ url: probe, depth: 1, score: 1_000_000 });
        }
      }
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

    if (result.error && !probeUrls.has(item.url)) {
      warnings.push(`${item.url}: ${result.error}`);
    }

    if (result.status === "success" && result.content && item.depth < config.maxDepth) {
      // Resolve relative links against the containing page, not the homepage —
      // deeper pages live under different paths.
      const links = extractLinks(result.content, item.url, config);
      const topLinks = getTopLinks(links, Math.max(1, config.maxPages - results.length));

      for (const link of topLinks) {
        if (!visited.has(link.url)) {
          queue.push({ url: link.url, depth: item.depth + 1, score: link.score });
        }
      }
    }
  }

  for (const atsUrl of atsUrls) {
    const page = await fetchPage(atsUrl, config);
    results.push(page);
    if (page.error) warnings.push(`${atsUrl}: ${page.error}`);
  }

  const enrichedResults = results.map((r) => {
    if (r.status === "success" && r.content) {
      const { title, text } = extractContent(r.content, r.url);
      return { ...r, title, content: text };
    }
    return r;
  });

  const output: CrawlerOutput = {
    pages: enrichedResults,
    baseUrl: normalizedBase,
    crawledAt: new Date().toISOString(),
    warnings: warnings.length ? warnings : undefined,
  };

  // Only cache crawls that actually yielded a page — a total outage must not
  // poison the cache for 24h.
  if (cacheKey && enrichedResults.some((r) => r.status === "success")) {
    await setCachedCrawl(cacheKey, normalizedBase, output);
  }

  return output;
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

  // Relevance gate: keyless search endpoints match loosely, so drop hits
  // that never mention the company — otherwise unrelated pages (spam,
  // name-collisions) pollute the brief's hiring-process context.
  const name = companyName.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const tokens = name.split(" ").filter((t) => t.length >= 4);
  const longest = tokens.sort((a, b) => b.length - a.length)[0];
  const relevant = results.filter((hit) => {
    const hay = `${hit.title} ${hit.snippet} ${hit.url}`.toLowerCase();
    return (name && hay.includes(name)) || (longest !== undefined && hay.includes(longest));
  });

  if (relevant.length === 0) {
    if (results.length > 0) {
      warnings.push(`Public search returned ${results.length} unrelated result(s) for "${companyName}"; ignored`);
    } else if (queriesFailed > 0) {
      warnings.push(`Public search failed for ${queriesFailed}/${queries.length} queries`);
    } else {
      warnings.push("Public search returned no results");
    }
  }

  return { query: companyName, results: relevant.slice(0, 12), warnings };
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
  // Bing RSS first — DuckDuckGo's HTML endpoint serves bot challenges (HTTP
  // 202, zero results) on several networks, which used to leave every kit
  // with no public discussion at all.
  try {
    const rss = await bingRssSearch(query, config);
    if (rss.length > 0) return rss;
  } catch {
    // Fall through to DuckDuckGo.
  }
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

function parseBingRss(
  xml: string,
  config: CrawlerConfig
): Array<{ url: string; title: string; snippet: string }> {
  const $ = cheerio.load(xml, { xmlMode: true });
  const results: Array<{ url: string; title: string; snippet: string }> = [];
  $("item").each((_, el) => {
    const $el = $(el);
    const title = $el.find("title").first().text().trim();
    const rawUrl = $el.find("link").first().text().trim();
    const url = rawUrl ? normalizeOutboundUrl(rawUrl) : null;
    const snippet = $el.find("description").first().text().trim().slice(0, 500);
    if (title && url && validateUrl(url, config).valid) {
      results.push({ url, title, snippet });
    }
  });
  return results.slice(0, 10);
}

async function bingRssSearch(
  query: string,
  config: CrawlerConfig
): Promise<Array<{ url: string; title: string; snippet: string }>> {
  const encoded = encodeURIComponent(query);
  const url = `https://www.bing.com/search?q=${encoded}&format=rss`;
  const res = await fetch(url, {
    headers: { "User-Agent": config.userAgent },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    throw new Error(`Bing RSS HTTP ${res.status}`);
  }
  return parseBingRss(await res.text(), config);
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
