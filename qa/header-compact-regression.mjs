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
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 }
];
const sampleScrollY = [0, 30, 60, 90, 120, 220];

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

      const samples = [];
      for (const scrollY of sampleScrollY) {
        await page.evaluate(y => scrollTo(0, y), scrollY);
        await page.waitForTimeout(100);
        samples.push({ scrollY, nav: await readNav() });
      }

      const top = samples[0]?.nav ?? null;
      const compact = samples.at(-1)?.nav ?? null;
      const delta = top && compact ? top.height - compact.height : 0;
      const allTargetHeights = samples.flatMap(sample => sample.nav?.targetHeights ?? []);
      const minTargetHeight = allTargetHeights.length ? Math.min(...allTargetHeights) : 0;
      const sampleHeights = samples.map(sample => sample.nav?.height ?? null);
      const stepDeltas = sampleHeights.slice(1).map((height, index) => {
        const previous = sampleHeights[index];
        return height === null || previous === null ? null : previous - height;
      });

      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(100);
      await page.screenshot({
        path: path.join(outputDir, `${locale}-${viewport.name}-top.png`),
        fullPage: false
      });
      await page.evaluate(() => scrollTo(0, 220));
      await page.waitForTimeout(100);
      await page.screenshot({
        path: path.join(outputDir, `${locale}-${viewport.name}-compact.png`),
        fullPage: false
      });

      const record = {
        scope,
        samples,
        delta,
        stepDeltas,
        minTargetHeight,
        consoleErrors,
        pageErrors
      };
      results.push(record);

      if (!top || !compact || samples.some(sample => !sample.nav)) {
        failures.push({ scope, reason: "nav-missing", samples });
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
          failures.push({ scope, reason: "touch-target-regression", minTargetHeight, samples });
        }

        for (let index = 1; index < sampleHeights.length; index += 1) {
          const previous = sampleHeights[index - 1];
          const current = sampleHeights[index];
          if (previous === null || current === null) continue;
          if (current > previous + 0.5) {
            failures.push({
              scope,
              reason: "non-monotonic-collapse",
              previousScrollY: sampleScrollY[index - 1],
              scrollY: sampleScrollY[index],
              previous,
              current
            });
          }
        }

        const intermediate = samples.filter(sample => sample.scrollY > 0 && sample.scrollY < 120);
        for (const sample of intermediate) {
          if (sample.nav.height >= top.height - 1 || sample.nav.height <= compact.height + 1) {
            failures.push({
              scope,
              reason: "missing-intermediate-collapse-state",
              scrollY: sample.scrollY,
              height: sample.nav.height,
              topHeight: top.height,
              compactHeight: compact.height
            });
          }
        }

        const earlyStepDeltas = stepDeltas.slice(0, 4).filter(value => value !== null);
        if (earlyStepDeltas.some(value => value < 3 || value > 10)) {
          failures.push({
            scope,
            reason: "collapse-step-too-abrupt",
            earlyStepDeltas,
            samples
          });
        }

        const fullCompactSample = samples.find(sample => sample.scrollY === 120)?.nav;
        if (!fullCompactSample || Math.abs(fullCompactSample.height - compact.height) > 1) {
          failures.push({
            scope,
            reason: "collapse-distance-regression",
            at120: fullCompactSample,
            compact
          });
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
  const progression = result.samples
    .map(sample => `${sample.scrollY}:${sample.nav.height.toFixed(1)}px`)
    .join(" -> ");
  console.log(`${result.scope}: ${progression}`);
}
