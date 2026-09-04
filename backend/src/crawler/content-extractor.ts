import * as cheerio from "cheerio";

const REMOVE_SELECTORS = [
  "script",
  "style",
  "noscript",
  "header",
  "footer",
  "nav",
  "aside",
  "svg",
  "picture",
  "video",
  "audio",
  "canvas",
  "iframe",
  "form",
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
  ".overlay",
  ".ad",
  ".ads",
  ".advertisement",
  ".alert",
  ".notification",
  ".banner",
  ".announcement",
  ".top-bar",
  ".toast",
  ".promo",
  ".share",
  ".social",
  ".social-share",
  ".widget",
  ".newsletter",
  ".subscribe",
  "[class*='cookie']",
  "[class*='consent']",
  "[id*='cookie']",
  "[id*='consent']",
  "[role=banner]",
  "[role=navigation]",
  "[role=complementary]",
  "[role=contentinfo]",
  "[aria-hidden='true']",
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

  contentEl.find("br, hr").replaceWith(" ");
  contentEl.find("p,div,h1,h2,h3,h4,h5,h6,li,section,article,tr,td,th,blockquote,pre,ul,ol,table,thead,tbody,tfoot,header,footer,nav,button,a,span,label").each((_, el) => {
    $(el).after(" ");
  });

  const title = $("title").first().text().trim() || $("h1").first().text().trim() || "";

  let text = contentEl.text().replace(/\s+/g, " ").trim();
  text = text.replace(/Your browser does not support the video tag\.?/gi, " ");
  text = text.replace(/\s+/g, " ").trim();
  if (text.length > 8000) text = text.slice(0, 8000).trim();

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