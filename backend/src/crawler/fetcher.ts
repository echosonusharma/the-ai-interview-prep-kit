import type { CrawlerConfig, CrawlResult } from "./types.js";
import { validateUrl, normalizeUrl } from "./url-validator.js";
import { getRobotsInfo } from "./robots.js";

interface HostLimiter {
  tokens: number;
  lastRefill: number;
  delayMs: number;
}

const hostLimiters = new Map<string, HostLimiter>();

function getHostLimiter(host: string, config: CrawlerConfig): HostLimiter {
  let limiter = hostLimiters.get(host);
  if (!limiter) {
    limiter = {
      tokens: config.rateLimitPerHost,
      lastRefill: Date.now(),
      delayMs: config.minDelayMs,
    };
    hostLimiters.set(host, limiter);
  }
  return limiter;
}

async function waitForToken(host: string, config: CrawlerConfig): Promise<void> {
  for (;;) {
    const limiter = getHostLimiter(host, config);
    const now = Date.now();

    const elapsed = now - limiter.lastRefill;
    const refillTokens = Math.floor(elapsed / limiter.delayMs) * config.rateLimitPerHost;
    if (refillTokens > 0) {
      limiter.tokens = Math.min(config.rateLimitPerHost, limiter.tokens + refillTokens);
      limiter.lastRefill = now;
    }

    if (limiter.tokens >= 1) {
      limiter.tokens -= 1;
      return;
    }

    const waitMs = Math.max(0, limiter.delayMs - elapsed);
    await new Promise((r) => setTimeout(r, waitMs));
  }
}

function updateLimiterDelay(host: string, crawlDelay?: number, config?: CrawlerConfig): void {
  const limiter = hostLimiters.get(host);
  if (!limiter || !config) return;
  const newDelay = crawlDelay ? crawlDelay * 1000 : config.minDelayMs;
  limiter.delayMs = Math.max(config.minDelayMs, newDelay);
}

async function fetchWithRetry(
  url: string,
  config: CrawlerConfig,
  attempt = 0
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": config.userAgent,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    return res;
  } catch (e) {
    if (attempt < config.maxRetries) {
      const backoff = config.backoffBaseMs * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise((r) => setTimeout(r, backoff));
      return fetchWithRetry(url, config, attempt + 1);
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchPage(
  url: string,
  config: CrawlerConfig
): Promise<CrawlResult> {
  const validation = validateUrl(url, config);
  if (!validation.valid) {
    return {
      url,
      status: "error",
      error: validation.error,
      fetchedAt: new Date().toISOString(),
    };
  }

  const robotsInfo = await getRobotsInfo(url, config);
  if (!robotsInfo.allowed) {
    return {
      url,
      status: "skipped",
      error: "Disallowed by robots.txt",
      fetchedAt: new Date().toISOString(),
    };
  }

  if (robotsInfo.crawlDelay) {
    updateLimiterDelay(new URL(url).host, robotsInfo.crawlDelay, config);
  }

  await waitForToken(new URL(url).host, config);

  let res: Response;
  try {
    res = await fetchWithRetry(url, config);
  } catch (e) {
    return {
      url,
      status: "error",
      error: e instanceof Error ? e.message : "Fetch failed",
      fetchedAt: new Date().toISOString(),
    };
  }

  if (res.url && res.url !== url) {
    const redirectCheck = validateUrl(res.url, config);
    if (!redirectCheck.valid) {
      return {
        url,
        status: "error",
        error: `Redirect blocked (${res.url}): ${redirectCheck.error}`,
        fetchedAt: new Date().toISOString(),
      };
    }
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
    return {
      url,
      status: "skipped",
      error: `Non-HTML content type: ${contentType}`,
      contentType,
      fetchedAt: new Date().toISOString(),
    };
  }

  const contentLength = res.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > config.maxContentLength) {
    return {
      url,
      status: "skipped",
      error: `Content too large: ${contentLength} bytes`,
      contentType,
      contentLength: parseInt(contentLength, 10),
      fetchedAt: new Date().toISOString(),
    };
  }

  let html = "";
  try {
    html = await res.text();
  } catch {
    return {
      url,
      status: "error",
      error: "Failed to read response body",
      fetchedAt: new Date().toISOString(),
    };
  }

  if (html.length > config.maxContentLength) {
    html = html.slice(0, config.maxContentLength);
  }

  return {
    url,
    status: res.ok ? "success" : "error",
    content: res.ok ? html : undefined,
    contentType,
    contentLength: html.length,
    error: res.ok ? undefined : `HTTP ${res.status}: ${res.statusText}`,
    fetchedAt: new Date().toISOString(),
  };
}

export function clearHostLimiters(): void {
  hostLimiters.clear();
}