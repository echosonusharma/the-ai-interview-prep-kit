import { isRateLimitError, withRetry } from "../retry.js";
import type { Provenance } from "./client.js";
import { logStyle as s } from "../log.js";

export interface Attempt<T> {
  run: () => Promise<T>;
  provenance: Provenance;
  retryable: boolean;
}

/**
 * Step-level failover: try each Zen model in order, retrying with backoff.
 * Returns the value plus which model actually produced it. Throws when every
 * model fails — the caller records the case as failed rather than inventing
 * a kit from templates.
 * Smart on TPM: 429/rate-limit retries only once briefly; large Retry-After immediately fails over.
 */
export async function runWithFallbacks<T>(label: string, attempts: Attempt<T>[]): Promise<{ value: T; provenance: Provenance }> {
  let lastError: unknown = null;
  for (const attempt of attempts) {
    try {
      const value = attempt.retryable
        ? await withRetry(attempt.run, {
            maxRetries: 0,
            backoffBaseMs: 400,
            onRetry: (n, err, waitMs) =>
              console.warn(
                `${s.label(`[${label}]`)} ${s.provider(attempt.provenance.provider)}/${s.model(attempt.provenance.model)} ${s.warn(`retry ${n + 1} in ${Math.round(waitMs)}ms`)}: ${s.detail(err instanceof Error ? err.message.slice(0, 220) : String(err))}`
              ),
          })
        : await attempt.run();
      return { value, provenance: attempt.provenance };
    } catch (error) {
      lastError = error;
      const rateLimited = isRateLimitError(error);
      const msg = error instanceof Error ? error.message : String(error);
      const limit = msg.includes("Raw output") ? 1500 : 220;
      const failTag = rateLimited ? s.warn("failed (rate-limited)") : s.fail("failed");
      console.warn(
        `${s.label(`[${label}]`)} ${s.provider(attempt.provenance.provider)}/${s.model(attempt.provenance.model)} ${failTag}: ${msg.includes("Raw output") ? s.raw(msg.slice(0, limit)) : s.detail(msg.slice(0, limit))}`
      );
      // Don't waste extra retries on same rate-limited provider — failover already handled by withRetry throwing fast
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`${label} failed on all providers`);
}
