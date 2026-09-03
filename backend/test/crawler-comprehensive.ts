import { crawlCompanySite } from "../src/crawler/index.js";
import { DEFAULT_CONFIG } from "../src/crawler/types.js";

interface TestCompany {
  name: string;
  url: string;
  category: string;
}

interface TestResult {
  name: string;
  url: string;
  category: string;
  pages: number;
  success: number;
  skipped: number;
  errors: number;
  hiringPages: string[];
  duration: number;
}

const TEST_COMPANIES: TestCompany[] = [
  { name: "Trao", url: "https://trao.ai/", category: "Assessment" },
  { name: "GitHub", url: "https://github.com", category: "Major tech" },
  { name: "GitLab", url: "https://about.gitlab.com", category: "Major tech" },
  { name: "PostHog", url: "https://posthog.com", category: "Major tech" },
  { name: "Stripe", url: "https://stripe.com", category: "Major tech" },
  { name: "Vercel", url: "https://vercel.com", category: "Major tech" },
  { name: "Netlify", url: "https://netlify.com", category: "Major tech" },
  { name: "Cloudflare", url: "https://cloudflare.com", category: "Major tech" },
  { name: "MongoDB", url: "https://mongodb.com", category: "Major tech" },
  { name: "Redis", url: "https://redis.io", category: "Major tech" },
  { name: "Elastic", url: "https://elastic.co", category: "Major tech" },
  { name: "Linear", url: "https://linear.app", category: "SaaS" },
  { name: "Notion", url: "https://notion.so", category: "SaaS" },
  { name: "Figma", url: "https://figma.com", category: "SaaS" },
  { name: "Retool", url: "https://retool.com", category: "SaaS" },
  { name: "Railway", url: "https://railway.app", category: "SaaS" },
  { name: "Render", url: "https://render.com", category: "SaaS" },
  { name: "Fly.io", url: "https://fly.io", category: "SaaS" },
  { name: "Supabase", url: "https://supabase.com", category: "SaaS" },
  { name: "Prisma", url: "https://prisma.io", category: "SaaS" },
  { name: "Tailscale", url: "https://tailscale.com", category: "Infra" },
  { name: "PlanetScale", url: "https://planetscale.com", category: "Infra" },
  { name: "Neon", url: "https://neon.tech", category: "Infra" },
  { name: "Turso", url: "https://turso.tech", category: "Infra" },
  { name: "Clerk", url: "https://clerk.com", category: "Auth" },
  { name: "Auth0", url: "https://auth0.com", category: "Auth" },
  { name: "WorkOS", url: "https://workos.com", category: "Auth" },
  { name: "Resend", url: "https://resend.com", category: "Email" },
  { name: "Loops", url: "https://loops.so", category: "Email" },
  { name: "Trigger.dev", url: "https://trigger.dev", category: "Background jobs" },
  { name: "Wellfound (AngelList)", url: "https://wellfound.com", category: "Job board" },
  { name: "Y Combinator Jobs", url: "https://www.ycombinator.com/jobs", category: "Job board" },
  { name: "Greenhouse", url: "https://www.greenhouse.io", category: "ATS" },
  { name: "Lever", url: "https://www.lever.co", category: "ATS" },
  { name: "Ashby", url: "https://ashbyhq.com", category: "ATS" },
];

async function runComprehensiveTest() {
  console.log("=".repeat(70));
  console.log("COMPREHENSIVE CRAWLER TEST - " + TEST_COMPANIES.length + " Companies");
  console.log("=".repeat(70));

  const results: TestResult[] = [];

  for (const company of TEST_COMPANIES) {
    const start = Date.now();
    console.log("\nCrawling: " + company.name + " (" + company.category + ")");
    console.log("   URL: " + company.url);

    try {
      const result = await crawlCompanySite(company.url, { ...DEFAULT_CONFIG, maxPages: 10 });
      const duration = Date.now() - start;

      const successPages = result.pages.filter(p => p.status === "success");
      const skippedPages = result.pages.filter(p => p.status === "skipped");
      const errorPages = result.pages.filter(p => p.status === "error");

      const hiringPages = successPages
        .filter(p => p.url !== company.url && p.url !== company.url + "/")
        .map(p => p.url)
        .slice(0, 5);

      console.log("   Done in " + duration + "ms - Pages: " + result.pages.length + ", Success: " + successPages.length + ", Skipped: " + skippedPages.length + ", Errors: " + errorPages.length);
      if (hiringPages.length > 0) {
        console.log("   Hiring-related pages found:");
        for (const hp of hiringPages) {
          console.log("      - " + hp);
        }
      } else {
        console.log("   No sub-pages found (only homepage)");
      }

      results.push({
        name: company.name,
        url: company.url,
        category: company.category,
        pages: result.pages.length,
        success: successPages.length,
        skipped: skippedPages.length,
        errors: errorPages.length,
        hiringPages,
        duration,
      });
    } catch (e) {
      const duration = Date.now() - start;
      console.log("   FAILED after " + duration + "ms: " + (e instanceof Error ? e.message : e));
      results.push({
        name: company.name,
        url: company.url,
        category: company.category,
        pages: 0,
        success: 0,
        skipped: 0,
        errors: 1,
        hiringPages: [],
        duration,
      });
    }
  }

  printSummary(results);
}

function printSummary(results: TestResult[]) {
  console.log("\n" + "=".repeat(70));
  console.log("SUMMARY");
  console.log("=".repeat(70));

  const total = results.length;
  const successful = results.filter(r => r.success > 0).length;
  const withHiringPages = results.filter(r => r.hiringPages.length > 0).length;
  const totalPages = results.reduce((sum, r) => sum + r.pages, 0);
  const totalSuccess = results.reduce((sum, r) => sum + r.success, 0);
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / total;

  console.log("\nOverall:");
  console.log("   Companies tested: " + total);
  console.log("   At least 1 success: " + successful + "/" + total + " (" + Math.round(successful/total*100) + "%)");
  console.log("   Found hiring pages: " + withHiringPages + "/" + total + " (" + Math.round(withHiringPages/total*100) + "%)");
  console.log("   Total pages fetched: " + totalPages);
  console.log("   Successful fetches: " + totalSuccess + " (" + Math.round(totalSuccess/totalPages*100) + "%)");
  console.log("   Avg duration: " + Math.round(avgDuration) + "ms");

  console.log("\nBy Category:");
  const categories = [...new Set(results.map(r => r.category))];
  for (const cat of categories) {
    const catResults = results.filter(r => r.category === cat);
    const catSuccess = catResults.filter(r => r.success > 0).length;
    const catHiring = catResults.filter(r => r.hiringPages.length > 0).length;
    console.log("   " + cat + ": " + catSuccess + "/" + catResults.length + " success, " + catHiring + " with hiring pages");
  }

  console.log("\nDetailed Results:");
  for (const r of results) {
    const status = r.success > 0 ? "[OK]" : "[FAIL]";
    const hiring = r.hiringPages.length > 0 ? " HIRING:" + r.hiringPages.length : "";
    console.log("   " + status + " " + r.name.padEnd(25) + " " + r.category.padEnd(12) + " Pages: " + r.pages + " Success: " + r.success + " Skipped: " + r.skipped + " Errors: " + r.errors + " (" + r.duration + "ms)" + hiring);
  }

  console.log("\n" + "=".repeat(70));
  console.log("HIRING PAGES DISCOVERED (sample):");
  console.log("=".repeat(70));
  for (const r of results.filter(r => r.hiringPages.length > 0)) {
    console.log("\n" + r.name + ":");
    for (const hp of r.hiringPages) {
      console.log("  - " + hp);
    }
  }
}

await runComprehensiveTest();