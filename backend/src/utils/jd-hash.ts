import { createHash } from "node:crypto";

export function normalizeCompanyUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  try {
    const url = new URL(trimmed);
    const params = new URLSearchParams(url.search);
    const kept: Array<[string, string]> = [];
    params.forEach((value, key) => {
      if (!/^utm_/i.test(key)) kept.push([key, value]);
    });
    kept.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    const search = new URLSearchParams(kept).toString();
    const path = url.pathname.replace(/\/+$/, "");
    const port = url.port ? `:${url.port}` : "";
    return `${url.protocol}//${url.hostname.toLowerCase()}${port}${path}${search ? `?${search}` : ""}`;
  } catch {
    return trimmed.toLowerCase().replace(/\/+$/, "");
  }
}

/** Stable hash for deduplicating kits per user (same JD + company URL + days). */
export function hashKitInput(rawJd: string, companyUrl: string, days: number): string {
  const normalized = `${rawJd.trim()}\n---\n${normalizeCompanyUrl(companyUrl)}\n---\n${days}`;
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}
