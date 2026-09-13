import fs from "node:fs";
import path from "node:path";
import { chromium, firefox, webkit } from "playwright";

const ORIGIN = process.env.QA_ORIGIN || "http://127.0.0.1:4173";
const BROWSER_NAME = process.env.QA_BROWSER || "chromium";
const browserType = { chromium, firefox, webkit }[BROWSER_NAME];

if (!browserType) {
  throw new Error(`Unsupported QA_BROWSER: ${BROWSER_NAME}`);
}

const locales = ["de", "en", "ru"];
const viewports = [
  { name: "desktop", width: 1440, height: 900, isMobile: false },
  { name: "mobile", width: 390, height: 844, isMobile: true }
];

const outputDir = path.join("qa-output", "cross-browser", BROWSER_NAME, "header-compact");
fs.mkdirSync(outputDir, { recursive: true });

const results = [];
const failures = [];
const browser = await browserType.launch({ headless: true });

try {
  for (const locale of locales) {
    for (const viewport of viewports) {
      const scope = `${BROWSER_NAME}/${locale}/${viewport.name}`;
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        isMobile: viewport.isMobile,
        hasTouch: viewport.isMobile,
        reducedMotion: "no-preference"
      });
      const page = await context.newPage();
      const consoleErrors = [];
      const pageErrors = [];
      page.on("console", message => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("pageerror", error => pageErrors.push(String(error)));

      const response = await page.goto(`${ORIGIN}/${locale}/`, {
        waitUntil: "networkidle",
        timeout: 30000
      });

      if (!response?.ok()) {
        failures.push({ scope, reason: "document-response", status: response?.status() ?? null });
        await context.close();
        continue;
      }

      await page.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(120);

      const readNav = () => page.evaluate(() => {
        const nav = document.querySelector(".site-nav");
        if (!nav) return null;
        const style = getComputedStyle(nav);
        const visibleTargets = [
          ...nav.querySelectorAll(".site-nav__mark, .site-nav__languages a, .site-nav__menu-toggle")
        ].filter(element => {
          const rect = element.getBoundingClientRect();
          const targetStyle = getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && targetStyle.display !== "none" && targetStyle.visibility !== "hidden";
        });
        return {
          height: nav.getBoundingClientRect().height,
          paddingTop: parseFloat(style.paddingTop) || 0,
          paddingBottom: parseFloat(style.paddingBottom) || 0,
          scrolled: nav.classList.contains("is-scrolled"),
          targetHeights: visibleTargets.map(element => element.getBoundingClientRect().height)
        };
      });

      const top = await readNav();
      await page.screenshot({
        path: path.join(outputDir, `${locale}-${viewport.name}-top.png`),
        fullPage: false
      });

      await page.evaluate(() => scrollTo(0, 220));
      await page.waitForTimeout(450);
      const compact = await readNav();
      await page.screenshot({
        path: path.join(outputDir, `${locale}-${viewport.name}-compact.png`),
        fullPage: false
      });

      const delta = top && compact ? top.height - compact.height : 0;
      const minTargetHeight = compact?.targetHeights?.length
        ? Math.min(...compact.targetHeights)
        : 0;

      const record = {
        scope,
        top,
        compact,
        delta,
        minTargetHeight,
        consoleErrors,
        pageErrors
      };
      results.push(record);

      if (!top || !compact) {
        failures.push({ scope, reason: "nav-missing", top, compact });
      } else {
        if (top.scrolled || !compact.scrolled) {
          failures.push({ scope, reason: "scroll-state", top, compact });
        }
        if (delta < 24) {
          failures.push({ scope, reason: "insufficient-height-reduction", delta, top, compact });
        }
        if (compact.height > 54) {
          failures.push({ scope, reason: "compact-header-too-tall", height: compact.height, top, compact });
        }
        if (minTargetHeight < 44) {
          failures.push({ scope, reason: "touch-target-regression", minTargetHeight, compact });
        }
      }

      if (consoleErrors.length || pageErrors.length) {
        failures.push({ scope, reason: "runtime-errors", consoleErrors, pageErrors });
      }

      await context.close();
    }
  }
} finally {
  await browser.close();
}

const report = {
  browser: BROWSER_NAME,
  origin: ORIGIN,
  status: failures.length ? "FAIL" : "PASS",
  failures,
  results
};

fs.writeFileSync(
  path.join(outputDir, "report.json"),
  JSON.stringify(report, null, 2) + "\n"
);

if (failures.length) {
  console.error(`Header compact regression QA failed with ${failures.length} issue(s).`);
  for (const failure of failures) console.error(JSON.stringify(failure));
  process.exit(1);
}

console.log(`PASS: ${BROWSER_NAME} header compact regression QA completed with 0 failures.`);
for (const result of results) {
  console.log(`${result.scope}: ${result.top.height.toFixed(1)}px -> ${result.compact.height.toFixed(1)}px (delta ${result.delta.toFixed(1)}px)`);
}
