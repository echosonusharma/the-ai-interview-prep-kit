import * as cheerio from "cheerio";

const REMOVE_SELECTORS = [
  "script",
  "style",
  "noscript",
  "header",
  "footer",
  "nav",
  "aside",
  ".nav",
  ".navbar",
  ".header",
  ".footer",
  ".sidebar",
  ".menu",
  ".breadcrumb",
  ".pagination",
  ".cookie",
  ".consent",
  ".popup",
  ".modal",
  ".ad",
  ".ads",
  ".advertisement",
  "[role=banner]",
  "[role=navigation]",
  "[role=complementary]",
  "[role=contentinfo]",
];

const CONTENT_SELECTORS = [
  "main",
  "article",
  "[role=main]",
  ".content",
  ".main-content",
  ".post-content",
  ".entry-content",
  ".page-content",
  ".article-body",
  ".post-body",
  "#content",
  "#main",
];

export function extractContent(html: string, url: string): { title: string; text: string } {
  const $ = cheerio.load(html);

  REMOVE_SELECTORS.forEach((sel) => $(sel).remove());

  let contentEl = $();
  for (const sel of CONTENT_SELECTORS) {
    contentEl = $(sel);
    if (contentEl.length > 0) break;
  }

  if (contentEl.length === 0) {
    contentEl = $("body");
  }

  const title = $("title").first().text().trim() || $("h1").first().text().trim() || "";

  const text = contentEl
    .text()
    .replace(/\s+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { title, text };
}

export function extractMetaDescription(html: string): string {
  const $ = cheerio.load(html);
  return (
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    ""
  ).trim();
}