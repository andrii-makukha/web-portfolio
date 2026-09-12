import { chromium, firefox, webkit } from "playwright";
import fs from "node:fs";
import path from "node:path";

const ORIGIN = process.env.QA_ORIGIN || "http://127.0.0.1:4173";
const BROWSER_NAME = process.env.QA_BROWSER || "webkit";
const browserType = { chromium, firefox, webkit }[BROWSER_NAME];
if (!browserType) throw new Error(`Unsupported QA_BROWSER: ${BROWSER_NAME}`);

const OUTPUT = path.resolve("qa-output", "cross-browser", BROWSER_NAME);
fs.mkdirSync(OUTPUT, { recursive: true });

const locales = ["de", "en", "ru"];
const chapters = ["top", "identity", "profile", "foundation", "capabilities", "ai", "work", "journey", "languages", "contact"];
const interactionViewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "macbook14", width: 1512, height: 982 },
  { name: "mobile", width: 390, height: 844 }
];
const textWidths = [320, 360, 390, 430, 560, 768, 1024, 1440, 1512, 1728];
const screenshotWidths = new Set([320, 390, 1440, 1512]);

const headingSelectors = [
  ".opening__name", ".identity__title", ".profile__display", ".foundation__display",
  ".foundation__closing", ".capabilities__display", ".capability-row__evidence strong",
  ".capability-row__result h3", ".capabilities__bridge", ".ai__display", ".workflow-step h3",
  ".ai-formula", ".ai-proof > h3", ".work__display", ".work-case__story h3",
  ".symbioz-grid__story h3", ".digital-work__intro h3", ".digital-card h4",
  ".work__closing > div", ".journey__display", ".journey-event__content h3",
  ".journey-ending", ".journey-education > h3", ".languages__display",
  ".language-row strong", ".contact__display"
];
const proseSelectors = [
  ".identity__statement", ".profile__lead", ".foundation__lead", ".capabilities__lead",
  ".capability-row__result p", ".ai__subheadline", ".ai__intro > p:not(.ai__subheadline)",
  ".workflow-step p", ".ai-proof details > p", ".work__lead", ".work-case__subtitle",
  ".work-case__body", ".symbioz-grid__story p", ".digital-work__intro > div",
  ".digital-card > p", ".journey__lead", ".journey-event__body", ".languages__lead"
];
const weakWords = {
  de: new Set(["und", "oder", "aber", "denn", "im", "in", "am", "an", "auf", "aus", "bei", "für", "mit", "nach", "von", "vor", "zu", "zur", "zum", "der", "die", "das", "ein", "eine"]),
  en: new Set(["and", "or", "but", "the", "a", "an", "to", "of", "in", "on", "for", "with", "at", "by", "from"]),
  ru: new Set(["и", "а", "но", "в", "во", "на", "из", "к", "ко", "с", "со", "у", "о", "об", "от", "до", "по", "за", "для", "не"])
};

const failures = [];
const results = [];
function fail(scope, message, data = null) { failures.push({ browser: BROWSER_NAME, scope, message, data }); }
function token(value) {
  return value.toLocaleLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}
async function settle(page, ms = 90) {
  await page.waitForTimeout(ms);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function attachDiagnostics(page, scope) {
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  const badResponses = [];
  page.on("console", msg => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  page.on("pageerror", error => pageErrors.push(String(error)));
  page.on("requestfailed", req => failedRequests.push({ url: req.url(), error: req.failure()?.errorText || "unknown" }));
  page.on("response", response => {
    if (response.url().startsWith(ORIGIN) && response.status() >= 400 && !response.url().endsWith("favicon.ico")) {
      badResponses.push({ url: response.url(), status: response.status() });
    }
  });
  return () => {
    if (consoleErrors.length) fail(scope, "Console errors", consoleErrors);
    if (pageErrors.length) fail(scope, "Page errors", pageErrors);
    if (failedRequests.length) fail(scope, "Failed requests", failedRequests);
    if (badResponses.length) fail(scope, "Bad same-origin responses", badResponses);
  };
}

async function runInteraction(browser, locale, viewport) {
  const scope = `${locale}/${viewport.name}`;
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    reducedMotion: "no-preference"
  });
  const page = await context.newPage();
  const flushDiagnostics = await attachDiagnostics(page, scope);
  try {
    const response = await page.goto(`${ORIGIN}/${locale}/`, { waitUntil: "networkidle", timeout: 30000 });
    if (!response?.ok()) fail(scope, "Document response was not successful", response?.status() ?? null);
    await page.evaluate(() => document.fonts?.ready);
    await page.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
    await settle(page, 140);

    const base = await page.evaluate(() => {
      const root = document.documentElement;
      const portrait = document.querySelector(".portrait-frame");
      const sticky = [...document.querySelectorAll("body *")].filter(el => getComputedStyle(el).position === "sticky").map(el => ({
        tag: el.tagName,
        id: el.id || "",
        className: typeof el.className === "string" ? el.className : "",
        top: getComputedStyle(el).top,
        rect: (() => { const r = el.getBoundingClientRect(); return { left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height }; })()
      }));
      return {
        supportsSticky: CSS.supports("position", "sticky"),
        supportsClipPath: CSS.supports("clip-path", "inset(0 0 0 0)"),
        clipPath: portrait ? getComputedStyle(portrait).clipPath : null,
        scrollWidth: root.scrollWidth,
        clientWidth: root.clientWidth,
        sticky,
        imageFailures: [...document.images].filter(img => !img.complete || img.naturalWidth <= 0).map(img => img.getAttribute("src")),
        externalResources: performance.getEntriesByType("resource").map(e => e.name).filter(url => {
          try { return new URL(url).origin !== location.origin; } catch { return true; }
        })
      };
    });
    if (!base.supportsSticky) fail(scope, "Browser does not report CSS sticky support");
    if (!base.supportsClipPath) fail(scope, "Browser does not report clip-path support");
    if (!base.clipPath || base.clipPath === "none") fail(scope, "Portrait clip-path is not active", base.clipPath);
    if (base.scrollWidth > base.clientWidth + 1) fail(scope, "Horizontal overflow at initial render", base);
    if (base.imageFailures.length) fail(scope, "Images failed to load", base.imageFailures);
    if (base.externalResources.length) fail(scope, "Unexpected external runtime resources", base.externalResources);

    const openingStart = await page.evaluate(() => ({
      transform: getComputedStyle(document.querySelector(".opening__name")).transform,
      progress: getComputedStyle(document.documentElement).getPropertyValue("--page-progress").trim()
    }));
    await page.evaluate(() => window.scrollTo(0, Math.round(innerHeight * 0.62)));
    await settle(page, 110);
    const openingAfter = await page.evaluate(() => ({
      transform: getComputedStyle(document.querySelector(".opening__name")).transform,
      progress: parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--page-progress")) || 0,
      navScrolled: document.querySelector(".site-nav")?.classList.contains("is-scrolled") || false
    }));
    if (openingAfter.transform === openingStart.transform || openingAfter.progress <= 0 || !openingAfter.navScrolled) {
      fail(scope, "Opening scroll motion/progress did not update", { openingStart, openingAfter });
    }

    for (const id of chapters) {
      await page.evaluate(sectionId => {
        const el = document.getElementById(sectionId);
        if (el) window.scrollTo(0, Math.max(0, el.offsetTop - 80));
      }, id);
      await settle(page, 110);
      const state = await page.evaluate(sectionId => {
        const section = document.getElementById(sectionId);
        const visibleRevealMissing = [...section.querySelectorAll("[data-reveal], .portrait-frame")].filter(el => {
          const r = el.getBoundingClientRect();
          return r.bottom > 0 && r.top < innerHeight && !el.classList.contains("is-visible");
        }).map(el => ({ tag: el.tagName, className: typeof el.className === "string" ? el.className : "" }));
        return {
          rail: document.querySelector("[data-rail][aria-current='true']")?.getAttribute("href") || null,
          expectedLight: (section?.dataset.nav || "dark") === "light",
          navLight: document.querySelector(".site-nav")?.classList.contains("is-light") || false,
          visibleRevealMissing,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth
        };
      }, id);
      if (state.rail !== `#${id}`) fail(scope, "Active chapter state mismatch", { id, ...state });
      if (state.navLight !== state.expectedLight) fail(scope, "Navigation theme mismatch", { id, ...state });
      if (state.visibleRevealMissing.length) fail(scope, "Visible reveal elements did not activate", { id, missing: state.visibleRevealMissing });
      if (state.scrollWidth > state.clientWidth + 1) fail(scope, "Horizontal overflow while chapter scrolling", { id, ...state });
    }

    const workflowCount = await page.locator("[data-workflow-step]").count();
    for (let i = 0; i < workflowCount; i++) {
      const step = page.locator("[data-workflow-step]").nth(i);
      await step.scrollIntoViewIfNeeded();
      await settle(page, 80);
      const state = await page.evaluate(index => {
        const steps = [...document.querySelectorAll("[data-workflow-step]")];
        const active = steps.find(el => el.classList.contains("is-active"));
        return { expected: steps[index]?.dataset.workflowStep || null, active: active?.dataset.workflowStep || null };
      }, i);
      if (state.active !== state.expected) fail(scope, "AI workflow active state mismatch", state);
    }

    const journeyCount = await page.locator("[data-journey-event]").count();
    for (let i = 0; i < journeyCount; i++) {
      const event = page.locator("[data-journey-event]").nth(i);
      await event.scrollIntoViewIfNeeded();
      await settle(page, 80);
      const state = await page.evaluate(index => {
        const events = [...document.querySelectorAll("[data-journey-event]")];
        const expected = events[index]?.dataset.journeyYear || null;
        const active = events.find(el => el.classList.contains("is-active"))?.dataset.journeyYear || null;
        const current = document.querySelector("[data-journey-current]")?.textContent?.trim() || null;
        return { expected, active, current };
      }, i);
      if (state.active !== state.expected || state.current !== state.expected) fail(scope, "Journey active state mismatch", state);
    }

    if (viewport.width <= 1180) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await settle(page, 60);
      const toggle = page.locator(".site-nav__menu-toggle");
      if (!(await toggle.isVisible())) {
        fail(scope, "Mobile menu toggle is not visible");
      } else {
        const box = await toggle.boundingBox();
        if (!box || box.height < 43.5) fail(scope, "Mobile menu touch target below 44px", box);
        await toggle.click();
        await settle(page, 80);
        const openState = await page.evaluate(() => ({
          expanded: document.querySelector(".site-nav__menu-toggle")?.getAttribute("aria-expanded"),
          hidden: document.querySelector(".mobile-menu")?.hidden,
          bodyOpen: document.body.classList.contains("menu-open"),
          mainInert: document.querySelector("#main-content")?.inert || false,
          mainAriaHidden: document.querySelector("#main-content")?.getAttribute("aria-hidden") || null,
          focusInside: document.querySelector(".mobile-menu")?.contains(document.activeElement) || false
        }));
        if (openState.expanded !== "true" || openState.hidden || !openState.bodyOpen || !openState.mainInert || openState.mainAriaHidden !== "true" || !openState.focusInside) {
          fail(scope, "Mobile menu open/focus state failed", openState);
        }
        await page.keyboard.press("Escape");
        await settle(page, 70);
        const closeState = await page.evaluate(() => ({
          expanded: document.querySelector(".site-nav__menu-toggle")?.getAttribute("aria-expanded"),
          hidden: document.querySelector(".mobile-menu")?.hidden,
          bodyOpen: document.body.classList.contains("menu-open"),
          focusOnToggle: document.activeElement === document.querySelector(".site-nav__menu-toggle")
        }));
        if (closeState.expanded !== "false" || !closeState.hidden || closeState.bodyOpen || !closeState.focusOnToggle) {
          fail(scope, "Mobile menu close/focus state failed", closeState);
        }
      }
    }

    await page.setViewportSize({ width: 844, height: 390 });
    await settle(page, 100);
    await page.setViewportSize({ width: 1024, height: 768 });
    await settle(page, 100);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await settle(page, 100);
    const resizeState = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      menuOpen: document.body.classList.contains("menu-open")
    }));
    if (resizeState.scrollWidth > resizeState.clientWidth + 1 || resizeState.menuOpen) fail(scope, "Resize/orientation stress left invalid state", resizeState);

    const stickyState = await page.evaluate(() => [...document.querySelectorAll("body *")]
      .filter(el => getComputedStyle(el).position === "sticky")
      .map(el => {
        const r = el.getBoundingClientRect();
        return { tag:el.tagName, id:el.id || "", className:typeof el.className === "string" ? el.className : "", width:r.width, height:r.height, left:r.left, right:r.right };
      }));
    for (const item of stickyState) {
      if (item.width <= 0 || item.height <= 0 || item.left < -2 || item.right > viewport.width + 2) fail(scope, "Sticky element geometry invalid", item);
    }

    await page.screenshot({ path: path.join(OUTPUT, `${locale}-${viewport.name}-top.png`), fullPage: false });
    results.push({ scope, base, openingAfter, stickyCount: stickyState.length });
    flushDiagnostics();
  } catch (error) {
    fail(scope, "Unhandled interaction QA exception", String(error?.stack || error));
    flushDiagnostics();
  } finally {
    await context.close();
  }
}

async function runTextAudit(browser, locale, width) {
  const scope = `${locale}/text-${width}`;
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  const flushDiagnostics = await attachDiagnostics(page, scope);
  try {
    await page.goto(`${ORIGIN}/${locale}/`, { waitUntil: "networkidle", timeout: 30000 });
    await page.evaluate(() => document.fonts?.ready);
    await page.addStyleTag({ content: "[data-reveal]{opacity:1!important;transform:none!important}.portrait-frame,.workflow-step,.journey-event{opacity:1!important;transform:none!important}" });
    await settle(page, 40);

    const audit = await page.evaluate(({ headingSelectors, proseSelectors }) => {
      const viewportWidth = document.documentElement.clientWidth;
      function visible(el) {
        const s = getComputedStyle(el); const r = el.getBoundingClientRect();
        return s.display !== "none" && s.visibility !== "hidden" && r.width > 0 && r.height > 0;
      }
      function collectLines(el) {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const tokens = []; const splitTokens = []; let node;
        while ((node = walker.nextNode())) {
          const text = node.textContent || "";
          for (const match of text.matchAll(/\S+/gu)) {
            const range = document.createRange();
            range.setStart(node, match.index); range.setEnd(node, match.index + match[0].length);
            const rects = [...range.getClientRects()].filter(r => r.width > .5 && r.height > .5);
            if (!rects.length) continue;
            const tops = [];
            for (const r of rects) if (!tops.some(t => Math.abs(t-r.top) < 1.5)) tops.push(r.top);
            if (tops.length > 1) splitTokens.push(match[0]);
            for (const r of rects) tokens.push({ token:match[0], top:r.top, left:r.left, right:r.right, outside:r.left < -1 || r.right > viewportWidth + 1 });
          }
        }
        tokens.sort((a,b) => a.top-b.top || a.left-b.left);
        const lines=[];
        for (const item of tokens) {
          let line=lines.find(x => Math.abs(x.top-item.top) < 2);
          if (!line) { line={top:item.top,tokens:[],left:item.left,right:item.right}; lines.push(line); }
          line.tokens.push(item.token); line.left=Math.min(line.left,item.left); line.right=Math.max(line.right,item.right);
        }
        lines.sort((a,b) => a.top-b.top);
        return { lines:lines.map(x => ({ tokens:x.tokens, width:x.right-x.left })), splitTokens, outside:tokens.filter(x => x.outside).map(x => x.token) };
      }
      function scan(selectors) {
        return selectors.flatMap(selector => [...document.querySelectorAll(selector)].filter(visible).map((el,index) => {
          const r=el.getBoundingClientRect(); const flow=collectLines(el);
          return { selector,index,text:(el.textContent||"").trim().replace(/\s+/g," "),clientWidth:el.clientWidth,scrollWidth:el.scrollWidth,rect:{left:r.left,right:r.right},...flow };
        }));
      }
      return { viewportWidth, documentScrollWidth:document.documentElement.scrollWidth, headings:scan(headingSelectors), prose:scan(proseSelectors) };
    }, { headingSelectors, proseSelectors });

    if (audit.documentScrollWidth > audit.viewportWidth + 1) fail(scope, "Document overflow", { scrollWidth:audit.documentScrollWidth, viewportWidth:audit.viewportWidth });
    for (const item of audit.headings) {
      const hardSplits = item.splitTokens.filter(value => !value.includes("-") && !value.includes("/"));
      if (item.scrollWidth > item.clientWidth + 2 || item.rect.left < -1 || item.rect.right > audit.viewportWidth + 1 || item.outside.length || hardSplits.length) {
        fail(scope, "Heading flow break", { ...item, splitTokens:hardSplits });
      }
      item.lines.forEach((line,lineIndex) => {
        const normalized=line.tokens.map(token).filter(Boolean);
        if (normalized.length === 1 && weakWords[locale].has(normalized[0])) fail(scope, "Isolated weak word", { selector:item.selector,index:item.index,lineIndex,line });
        if (normalized.length === 1 && normalized[0].length === 1 && !/^\d$/u.test(normalized[0])) fail(scope, "Isolated single letter", { selector:item.selector,index:item.index,lineIndex,line });
      });
      if (item.lines.length >= 7) fail(scope, "Excessive heading line count", { selector:item.selector,index:item.index,lineCount:item.lines.length,text:item.text });
    }
    for (const item of audit.prose) {
      const hardSplits=item.splitTokens.filter(value => !value.includes("-") && !value.includes("/"));
      if (item.scrollWidth > item.clientWidth + 2 || item.outside.length || hardSplits.length) fail(scope, "Prose flow break", { ...item, splitTokens:hardSplits });
    }

    if (screenshotWidths.has(width)) await page.screenshot({ path:path.join(OUTPUT, `text-${locale}-${width}.png`), fullPage:true });
    results.push({ scope, textAudit:{ width, headingCount:audit.headings.length, proseCount:audit.prose.length } });
    flushDiagnostics();
  } catch (error) {
    fail(scope, "Unhandled text-flow QA exception", String(error?.stack || error));
    flushDiagnostics();
  } finally {
    await context.close();
  }
}

const browser = await browserType.launch({ headless:true });
try {
  for (const locale of locales) {
    for (const viewport of interactionViewports) await runInteraction(browser, locale, viewport);
    for (const width of textWidths) await runTextAudit(browser, locale, width);
  }
} finally {
  await browser.close();
}

const report = { browser:BROWSER_NAME, generatedAt:new Date().toISOString(), failureCount:failures.length, failures, results, interactionViewports, textWidths, locales };
fs.writeFileSync(path.join(OUTPUT, "cross-browser-report.json"), JSON.stringify(report,null,2));
fs.writeFileSync(path.join(OUTPUT, "cross-browser-summary.txt"), `Cross-browser QA\nBrowser: ${BROWSER_NAME}\nFailures: ${failures.length}\nLocales: ${locales.join(", ")}\nInteraction viewports: ${interactionViewports.map(v=>`${v.width}x${v.height}`).join(", ")}\nText widths: ${textWidths.join(", ")}\n`);

if (failures.length) {
  console.error(`FAIL: ${BROWSER_NAME} cross-browser QA found ${failures.length} issue(s).`);
  console.error(JSON.stringify(failures.slice(0,120),null,2));
  process.exit(1);
}
console.log(`PASS: ${BROWSER_NAME} cross-browser QA completed with 0 failures.`);
