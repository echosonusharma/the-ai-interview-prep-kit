export interface RetryOptions {
  maxRetries?: number;
  backoffBaseMs?: number;
  onRetry?: (attempt: number, error: unknown, waitMs: number) => void;
}

function errorText(error: unknown): string {
  // Walk the cause chain: gateways (Zen) can wrap a 502 body inside a
  // top-level "Invalid JSON response" message.
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current instanceof Error; depth++) {
    parts.push(current.message);
    current = current.cause;
  }
  return parts.join(" | ");
}

export function isRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const text = errorText(error);
  return /429|rate.?limit|too many requests/i.test(text);
}

function isRetryable(error: unknown): boolean {
  if (error instanceof Error) {
    // AI SDK + fetch errors: retry rate limits, overload, network faults.
    const text = errorText(error);
    if (/429|rate.?limit|too many requests/i.test(text)) return true;
    if (/5\d\d|overloaded|temporar|timeout|abort|econn|enotfound|socket/i.test(text)) return true;
    const status = (error as { statusCode?: number; status?: number }).statusCode ??
      (error as { status?: number }).status;
    if (typeof status === "number" && (status === 429 || status >= 500)) return true;
  }
  return false;
}

export function retryAfterMs(error: unknown): number | null {
  const headers = (error as { responseHeaders?: Record<string, string> }).responseHeaders;
  const raw = headers?.["retry-after"] ?? headers?.["Retry-After"];
  if (raw) {
    const secs = Number(raw);
    if (Number.isFinite(secs)) return secs * 1000;
  }
  const match = error instanceof Error ? error.message.match(/retry after (\d+)s/i) : null;
  return match ? Number(match[1]) * 1000 : null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Run fn with exponential backoff + jitter on retryable failures.
 * Honors Retry-After when present. Non-retryable errors throw immediately.
 * For TPM/429 with a large Retry-After (>2.5s), don't retry same provider —
 * let the caller fail over to next provider immediately (saves TPM + time).
 */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const { maxRetries = 3, backoffBaseMs = 1000, onRetry } = opts;
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= maxRetries || !isRetryable(error)) throw error;
      const after = retryAfterMs(error);
      // Smart switch: if provider says wait >2.5s for TPM, don't waste time re-trying same provider
      if (isRateLimitError(error) && after !== null && after > 2500) throw error;
      const waitMs = after ?? backoffBaseMs * Math.pow(2, attempt) + Math.random() * 500;
      onRetry?.(attempt, error, waitMs);
      await sleep(Math.min(waitMs, 10_000));
      attempt += 1;
    }
  }
}
