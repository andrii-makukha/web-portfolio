import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const ORIGIN = process.env.QA_ORIGIN || "http://127.0.0.1:4173";
const OUTPUT = path.resolve("qa-output");
fs.mkdirSync(OUTPUT, { recursive: true });

const locales = ["de", "en", "ru"];
const widths = [320, 344, 360, 375, 390, 393, 412, 430, 480, 540, 560, 561, 575, 600, 640, 768, 834, 900, 901, 1024, 1180, 1181, 1280, 1440, 1536, 1728];
const screenshotWidths = new Set([320, 360, 390, 430, 560, 600]);

const headingSelectors = [
  ".opening__name",
  ".identity__title",
  ".profile__display",
  ".foundation__display",
  ".foundation__closing",
  ".capabilities__display",
  ".capability-row__evidence strong",
  ".capability-row__result h3",
  ".capabilities__bridge",
  ".ai__display",
  ".workflow-step h3",
  ".ai-formula",
  ".ai-proof > h3",
  ".work__display",
  ".work-case__story h3",
  ".symbioz-grid__story h3",
  ".digital-work__intro h3",
  ".digital-card h4",
  ".work__closing > div",
  ".journey__display",
  ".journey-event__content h3",
  ".journey-ending",
  ".journey-education > h3",
  ".languages__display",
  ".language-row strong",
  ".contact__display"
];

const proseSelectors = [
  ".identity__statement",
  ".profile__lead",
  ".foundation__lead",
  ".capabilities__lead",
  ".capability-row__result p",
  ".ai__subheadline",
  ".ai__intro > p:not(.ai__subheadline)",
  ".workflow-step p",
  ".ai-proof details > p",
  ".work__lead",
  ".work-case__subtitle",
  ".work-case__body",
  ".symbioz-grid__story p",
  ".digital-work__intro > div",
  ".digital-card > p",
  ".journey__lead",
  ".journey-event__body",
  ".languages__lead"
];

const weakWords = {
  de: new Set(["und", "oder", "aber", "denn", "im", "in", "am", "an", "auf", "aus", "bei", "für", "mit", "nach", "von", "vor", "zu", "zur", "zum", "der", "die", "das", "ein", "eine"]),
  en: new Set(["and", "or", "but", "the", "a", "an", "to", "of", "in", "on", "for", "with", "at", "by", "from"]),
  ru: new Set(["и", "а", "но", "в", "во", "на", "из", "к", "ко", "с", "со", "у", "о", "об", "от", "до", "по", "за", "для", "не"])
};

const failures = [];
const warnings = [];
const snapshots = [];

function normalizeToken(token) {
  return token
    .toLocaleLowerCase()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

function hardWordSplits(splitTokens) {
  // A visible hyphen is an intentional linguistic break opportunity. The stress gate
  // blocks arbitrary mid-word fragmentation but does not penalize E-Mail / React-App style breaks.
  return splitTokens.filter(({ token }) => !token.includes("-") && !token.includes("/"));
}

function pushFailure(locale, width, issue) {
  failures.push({ locale, width, ...issue });
}

function pushWarning(locale, width, issue) {
  warnings.push({ locale, width, ...issue });
}

const browser = await chromium.launch({ headless: true });

try {
  for (const locale of locales) {
    for (const width of widths) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`${ORIGIN}/${locale}/`, { waitUntil: "networkidle", timeout: 30000 });
      await page.evaluate(() => document.fonts?.ready);
      await page.addStyleTag({
        content: "[data-reveal]{opacity:1!important;transform:none!important}.workflow-step,.journey-event{opacity:1!important;transform:none!important}"
      });

      const audit = await page.evaluate(({ headingSelectors, proseSelectors }) => {
        const viewportWidth = document.documentElement.clientWidth;

        function visible(el) {
          const style = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
        }

        function collectLines(el) {
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          const tokens = [];
          const splitTokens = [];
          let node;

          while ((node = walker.nextNode())) {
            const text = node.textContent || "";
            for (const match of text.matchAll(/\S+/gu)) {
              const range = document.createRange();
              range.setStart(node, match.index);
              range.setEnd(node, match.index + match[0].length);
              const rects = [...range.getClientRects()].filter(rect => rect.width > 0.5 && rect.height > 0.5);
              if (!rects.length) continue;

              const uniqueTops = [];
              for (const rect of rects) {
                if (!uniqueTops.some(top => Math.abs(top - rect.top) < 1.5)) uniqueTops.push(rect.top);
              }
              if (uniqueTops.length > 1) {
                splitTokens.push({ token: match[0], lineCount: uniqueTops.length });
              }

              for (const rect of rects) {
                tokens.push({
                  token: match[0],
                  top: rect.top,
                  left: rect.left,
                  right: rect.right,
                  width: rect.width,
                  outsideViewport: rect.left < -1 || rect.right > viewportWidth + 1
                });
              }
            }
          }

          tokens.sort((a, b) => a.top - b.top || a.left - b.left);
          const lines = [];
          for (const token of tokens) {
            let line = lines.find(candidate => Math.abs(candidate.top - token.top) < 2);
            if (!line) {
              line = { top: token.top, tokens: [], left: token.left, right: token.right };
              lines.push(line);
            }
            line.tokens.push(token.token);
            line.left = Math.min(line.left, token.left);
            line.right = Math.max(line.right, token.right);
          }
          lines.sort((a, b) => a.top - b.top);

          return {
            lines: lines.map(line => ({
              text: line.tokens.join(" "),
              tokens: line.tokens,
              width: Number((line.right - line.left).toFixed(2)),
              left: Number(line.left.toFixed(2)),
              right: Number(line.right.toFixed(2))
            })),
            splitTokens,
            outsideViewport: tokens.filter(token => token.outsideViewport).map(token => token.token)
          };
        }

        function scan(selectors) {
          return selectors.flatMap(selector => [...document.querySelectorAll(selector)].filter(visible).map((el, index) => {
            const rect = el.getBoundingClientRect();
            const style = getComputedStyle(el);
            const flow = collectLines(el);
            return {
              selector,
              index,
              tag: el.tagName,
              text: (el.textContent || "").trim().replace(/\s+/g, " "),
              rect: {
                left: Number(rect.left.toFixed(2)),
                right: Number(rect.right.toFixed(2)),
                width: Number(rect.width.toFixed(2)),
                height: Number(rect.height.toFixed(2))
              },
              clientWidth: el.clientWidth,
              scrollWidth: el.scrollWidth,
              fontSize: style.fontSize,
              lineHeight: style.lineHeight,
              whiteSpace: style.whiteSpace,
              overflowWrap: style.overflowWrap,
              wordBreak: style.wordBreak,
              textWrap: style.textWrap || style.getPropertyValue("text-wrap"),
              ...flow
            };
          }));
        }

        return {
          headings: scan(headingSelectors),
          prose: scan(proseSelectors),
          viewportWidth,
          documentScrollWidth: document.documentElement.scrollWidth
        };
      }, { headingSelectors, proseSelectors });

      if (audit.documentScrollWidth > audit.viewportWidth + 1) {
        pushFailure(locale, width, {
          kind: "document-overflow",
          scrollWidth: audit.documentScrollWidth,
          viewportWidth: audit.viewportWidth
        });
      }

      for (const item of audit.headings) {
        const base = { selector: item.selector, index: item.index, text: item.text, lines: item.lines };
        const hardSplits = hardWordSplits(item.splitTokens);

        if (item.scrollWidth > item.clientWidth + 2) {
          pushFailure(locale, width, { kind: "heading-internal-overflow", ...base, clientWidth: item.clientWidth, scrollWidth: item.scrollWidth });
        }
        if (item.rect.left < -1 || item.rect.right > audit.viewportWidth + 1 || item.outsideViewport.length) {
          pushFailure(locale, width, { kind: "heading-viewport-overflow", ...base, rect: item.rect, outsideViewport: item.outsideViewport });
        }
        if (hardSplits.length) {
          pushFailure(locale, width, { kind: "mid-word-wrap", ...base, splitTokens: hardSplits });
        }

        item.lines.forEach((line, lineIndex) => {
          const normalized = line.tokens.map(token => normalizeToken(token)).filter(Boolean);
          if (!normalized.length) {
            pushFailure(locale, width, { kind: "punctuation-only-line", ...base, lineIndex, line });
            return;
          }
          if (normalized.length === 1 && weakWords[locale].has(normalized[0])) {
            pushFailure(locale, width, { kind: "isolated-weak-word", ...base, lineIndex, line });
          }
          if (normalized.length === 1 && normalized[0].length === 1 && !/^\d$/u.test(normalized[0])) {
            pushFailure(locale, width, { kind: "isolated-single-letter", ...base, lineIndex, line });
          }
        });

        if (item.lines.length >= 7) {
          pushFailure(locale, width, { kind: "excessive-heading-lines", ...base, lineCount: item.lines.length });
        }

        if (item.lines.length >= 3) {
          const widthsOnLines = item.lines.map(line => line.width).filter(Boolean);
          const maxLine = Math.max(...widthsOnLines);
          const minLine = Math.min(...widthsOnLines);
          const ratio = maxLine ? minLine / maxLine : 1;
          if (ratio < 0.22) {
            pushWarning(locale, width, { kind: "strong-heading-rag", ...base, ratio: Number(ratio.toFixed(3)) });
          }
        }
      }

      for (const item of audit.prose) {
        const base = { selector: item.selector, index: item.index, text: item.text, lines: item.lines };
        const hardSplits = hardWordSplits(item.splitTokens);
        if (item.scrollWidth > item.clientWidth + 2 || hardSplits.length || item.outsideViewport.length) {
          pushFailure(locale, width, {
            kind: "prose-flow-break",
            ...base,
            clientWidth: item.clientWidth,
            scrollWidth: item.scrollWidth,
            splitTokens: hardSplits,
            outsideViewport: item.outsideViewport
          });
        }

        if (item.lines.length >= 3) {
          const last = item.lines.at(-1);
          const normalized = last.tokens.map(token => normalizeToken(token)).filter(Boolean);
          if (normalized.length === 1 && normalized[0].length <= 4) {
            pushWarning(locale, width, { kind: "short-prose-tail", ...base, lastLine: last });
          }
        }
      }

      snapshots.push({ locale, width, headings: audit.headings, prose: audit.prose });

      if (screenshotWidths.has(width)) {
        await page.screenshot({
          path: path.join(OUTPUT, `text-flow-${locale}-${width}.png`),
          fullPage: true
        });
      }

      await page.close();
    }
  }
} finally {
  await browser.close();
}

const report = {
  generatedAt: new Date().toISOString(),
  widths,
  locales,
  failureCount: failures.length,
  warningCount: warnings.length,
  failures,
  warnings,
  snapshots
};

fs.writeFileSync(path.join(OUTPUT, "text-flow-stress-report.json"), JSON.stringify(report, null, 2));
fs.writeFileSync(
  path.join(OUTPUT, "text-flow-stress-summary.txt"),
  `Text-flow stress QA\nFailures: ${failures.length}\nWarnings: ${warnings.length}\nWidths: ${widths.join(", ")}\nLocales: ${locales.join(", ")}\n`
);

if (failures.length) {
  console.error(`FAIL: text-flow stress QA detected ${failures.length} blocking issue(s) and ${warnings.length} warning(s).`);
  console.error(JSON.stringify(failures.slice(0, 100), null, 2));
  process.exit(1);
}

console.log(`PASS: text-flow stress QA found no blocking issues. Warnings: ${warnings.length}.`);
