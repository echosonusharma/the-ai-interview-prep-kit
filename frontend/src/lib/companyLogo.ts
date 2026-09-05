/** Resolve a company logo from its website URL with graceful fallbacks. */
export function domainOf(url: string | null | undefined): string {
  if (!url) return "";
  try {
    const withProto = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    return new URL(withProto).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/** Ordered logo sources for a domain, best quality first. */
export function logoSourcesFor(domain: string): string[] {
  if (!domain) return [];
  return [
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    `https://unavatar.io/${domain}?fallback=false`,
  ];
}
