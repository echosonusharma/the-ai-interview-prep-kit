import * as cheerio from "cheerio";
import type { CrawlerConfig, CrawlResult, ScoredLink, CrawlerOutput } from "./types.js";
import { DEFAULT_CONFIG, HIRING_KEYWORDS } from "./types.js";
import { fetchPage } from "./fetcher.js";
import { extractLinks, getTopLinks } from "./link-extractor.js";
import { extractContent } from "./content-extractor.js";
import { validateUrl } from "./url-validator.js";

interface CrawlQueueItem {
  url: string;
  depth: number;
  score: number;
}

export async function crawlCompanySite(
  baseUrl: string,
  userConfig: Partial<CrawlerConfig> = {}
): Promise<CrawlerOutput> {
  const config = { ...DEFAULT_CONFIG, ...userConfig };
  const validation = validateUrl(baseUrl, config);
  if (!validation.valid) {
    return {
      pages: [],
      baseUrl,
      crawledAt: new Date().toISOString(),
      robotsInfo: { allowed: false },
    };
  }

  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
  const results: CrawlResult[] = [];
  const queue: CrawlQueueItem[] = [{ url: normalizedBase, depth: 0, score: 100 }];
  const visited = new Set<string>();
  const errors: string[] = [];

  const homepageResult = await fetchPage(normalizedBase, config);
  results.push(homepageResult);

  if (homepageResult.status === "success" && homepageResult.content) {
    const links = extractLinks(homepageResult.content, normalizedBase, config);
    const topLinks = getTopLinks(links, config.maxPages - 1);

    for (const link of topLinks) {
      queue.push({ url: link.url, depth: 1, score: link.score });
    }
  } else if (homepageResult.error) {
    errors.push(`Homepage: ${homepageResult.error}`);
  }

  while (queue.length > 0 && results.length < config.maxPages) {
    const item = queue.shift()!;
    if (visited.has(item.url)) continue;
    if (item.depth > config.maxDepth) continue;

    visited.add(item.url);

    const result = await fetchPage(item.url, config);
    results.push(result);

    if (result.error) {
      errors.push(`${item.url}: ${result.error}`);
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

    queue.sort((a, b) => b.score - a.score);
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
  };
}

export async function searchPublicDiscussion(
  companyName: string,
  companyUrl: string
): Promise<{ query: string; results: Array<{ url: string; title: string; snippet: string }> }> {
  const queries = [
    `"${companyName}" interview process`,
    `"${companyName}" hiring process`,
    `"${companyName}" engineering interview`,
    `site:glassdoor.com "${companyName}" interview`,
    `site:reddit.com "${companyName}" interview`,
  ];

  const results: Array<{ url: string; title: string; snippet: string }> = [];

  for (const query of queries) {
    try {
      const searchResults = await simpleWebSearch(query);
      results.push(...searchResults);
      if (results.length >= 10) break;
    } catch {
    }
  }

  return { query: companyName, results: results.slice(0, 10) };
}

async function simpleWebSearch(query: string): Promise<Array<{ url: string; title: string; snippet: string }>> {
  const encoded = encodeURIComponent(query);
  const url = `https://html.duckduckgo.com/html/?q=${encoded}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PrepKitBot/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();
    return parseSearchResults(html);
  } catch {
    return [];
  }
}

function parseSearchResults(html: string): Array<{ url: string; title: string; snippet: string }> {
  const $ = cheerio.load(html);
  const results: Array<{ url: string; title: string; snippet: string }> = [];

  $(".result__snippet, .result__title, .result__url").each((_, el) => {
    const $el = $(el);
    const title = $el.find(".result__title").text().trim() || $el.text().trim();
    const url = $el.find(".result__url").text().trim() || $el.find("a").attr("href") || "";
    const snippet = $el.find(".result__snippet").text().trim();

    if (title && url) {
      results.push({ url, title, snippet });
    }
  });

  return results.slice(0, 10);
}