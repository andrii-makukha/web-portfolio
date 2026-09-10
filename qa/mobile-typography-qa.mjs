import { chromium } from "playwright";

const origin = process.env.QA_ORIGIN || "http://127.0.0.1:4173";
const locales = ["de", "en", "ru"];
const widths = [320, 360];
const displaySelector = [
  ".profile__display",
  ".foundation__display",
  ".capabilities__display",
  ".ai__display",
  ".work__display",
  ".journey__display",
  ".languages__display",
].join(", ");

const browser = await chromium.launch({ headless: true });
const failures = [];

try {
  for (const locale of locales) {
    for (const width of widths) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`${origin}/${locale}/`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts?.ready);

      const issues = await page.evaluate((selector) => {
        const results = [];
        const viewportWidth = document.documentElement.clientWidth;

        for (const element of document.querySelectorAll(selector)) {
          const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
          let node;

          while ((node = walker.nextNode())) {
            const text = node.textContent || "";
            const words = [...text.matchAll(/\S+/gu)];

            for (const match of words) {
              const start = match.index;
              const end = start + match[0].length;
              const range = document.createRange();
              range.setStart(node, start);
              range.setEnd(node, end);

              const rects = [...range.getClientRects()].filter(
                (rect) => rect.width > 0.5 && rect.height > 0.5,
              );
              const lineTops = [];

              for (const rect of rects) {
                if (!lineTops.some((top) => Math.abs(top - rect.top) < 1.5)) {
                  lineTops.push(rect.top);
                }

                if (rect.left < -1 || rect.right > viewportWidth + 1) {
                  results.push({
                    kind: "viewport-overflow",
                    selector: element.className,
                    word: match[0],
                    left: Number(rect.left.toFixed(2)),
                    right: Number(rect.right.toFixed(2)),
                    viewportWidth,
                  });
                }
              }

              if (lineTops.length > 1) {
                results.push({
                  kind: "mid-word-wrap",
                  selector: element.className,
                  word: match[0],
                  lines: lineTops.length,
                });
              }
            }
          }
        }

        return results;
      }, displaySelector);

      if (issues.length) {
        failures.push({ locale, width, issues });
      }

      await page.close();
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error("FAIL: mobile editorial typography regression detected.");
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
}

console.log("PASS: mobile editorial display words remain intact at 320px and 360px in DE/EN/RU.");
