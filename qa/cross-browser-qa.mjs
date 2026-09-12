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
const chapterIds = ["top", "identity", "profile", "foundation", "capabilities", "ai", "work", "journey", "languages", "contact"];
const interactionViewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "macbook14", width: 1512, height: 982 },
  { name: "mobile", width: 390, height: 844 }
];
const textWidths = [320, 360, 390, 430, 560, 768, 1024, 1440, 1512, 1728];

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
const fail = (scope, message, data = null) => failures.push({ browser: BROWSER_NAME, scope, message, data });
const normalizeToken = value => value.toLocaleLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");

async function settle(page, ms = 130) {
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

async function getLayoutState(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const vw = root.clientWidth;
    const visible = el => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== "none" && s.visibility !== "hidden" && Number(s.opacity) !== 0 && r.width > 1 && r.height > 1;
    };
    const offenders = [...document.querySelectorAll("body *")]
      .filter(visible)
      .map(el => {
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          id: el.id || "",
          className: typeof el.className === "string" ? el.className : "",
          left: Math.round(r.left * 10) / 10,
          right: Math.round(r.right * 10) / 10,
          width: Math.round(r.width * 10) / 10,
          clientWidth: el.clientWidth,
          scrollWidth: el.scrollWidth,
          text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 120)
        };
      })
      .filter(x => x.left < -1 || x.right > vw + 1 || x.scrollWidth > x.clientWidth + 2)
      .sort((a, b) => Math.max(b.right - vw, b.scrollWidth - b.clientWidth) - Math.max(a.right - vw, a.scrollWidth - a.clientWidth))
      .slice(0, 30);
    return { viewportWidth: vw, documentScrollWidth: root.scrollWidth, offenders };
  });
}

async function expectedProbeState(page, selector, datasetKey) {
  return page.evaluate(({ selector, datasetKey }) => {
    const items = [...document.querySelectorAll(selector)];
    const probe = innerHeight * 0.5;
    const containing = items.find(item => {
      const r = item.getBoundingClientRect();
      return r.top <= probe && r.bottom > probe;
    });
    const expected = containing || items.reduce((closest, item) => {
      const r = item.getBoundingClientRect();
      const distance = Math.abs(r.top + r.height / 2 - probe);
      if (!closest || distance < closest.distance) return { item, distance };
      return closest;
    }, null)?.item || items[0] || null;
    const active = items.find(item => item.classList.contains("is-active")) || null;
    return {
      expected: expected?.dataset?.[datasetKey] || null,
      active: active?.dataset?.[datasetKey] || null
    };
  }, { selector, datasetKey });
}

async function scrollItemToProbe(page, selector, index) {
  await page.evaluate(({ selector, index }) => {
    const el = document.querySelectorAll(selector)[index];
    if (!el) return;
    const r = el.getBoundingClientRect();
    const absoluteCenter = scrollY + r.top + r.height / 2;
    const target = absoluteCenter - innerHeight * 0.5;
    scrollTo(0, Math.max(0, Math.min(target, document.documentElement.scrollHeight - innerHeight)));
  }, { selector, index });
  await settle(page, 170);
}

async function runInteraction(browser, locale, viewport) {
  const scope = `${locale}/${viewport.name}`;
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1, reducedMotion: "no-preference" });
  const page = await context.newPage();
  const flushDiagnostics = await attachDiagnostics(page, scope);
  try {
    const response = await page.goto(`${ORIGIN}/${locale}/`, { waitUntil: "networkidle", timeout: 30000 });
    if (!response?.ok()) fail(scope, "Document response was not successful", response?.status() ?? null);
    await page.evaluate(() => document.fonts?.ready);
    await page.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
    await settle(page, 170);

    const support = await page.evaluate(() => ({
      sticky: CSS.supports("position", "sticky"),
      clipPath: CSS.supports("clip-path", "inset(0 0 0 0)"),
      portraitClip: getComputedStyle(document.querySelector(".portrait-frame")).clipPath,
      externalResources: performance.getEntriesByType("resource").map(e => e.name).filter(url => {
        try { return new URL(url).origin !== location.origin; } catch { return true; }
      })
    }));
    if (!support.sticky) fail(scope, "Browser does not report CSS sticky support");
    if (!support.clipPath) fail(scope, "Browser does not report clip-path support");
    if (!support.portraitClip || support.portraitClip === "none") fail(scope, "Portrait clip-path is not active", support.portraitClip);
    if (support.externalResources.length) fail(scope, "Unexpected external runtime resources", support.externalResources);

    const initialLayout = await getLayoutState(page);
    if (initialLayout.documentScrollWidth > initialLayout.viewportWidth + 1) fail(scope, "Horizontal overflow at initial render", initialLayout);

    const openingStart = await page.evaluate(() => ({
      transform: getComputedStyle(document.querySelector(".opening__name")).transform,
      progress: parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--page-progress")) || 0
    }));
    await page.evaluate(() => scrollTo(0, Math.round(innerHeight * 0.62)));
    await settle(page, 170);
    const openingAfter = await page.evaluate(() => ({
      transform: getComputedStyle(document.querySelector(".opening__name")).transform,
      progress: parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--page-progress")) || 0,
      navScrolled: document.querySelector(".site-nav")?.classList.contains("is-scrolled") || false
    }));
    if (openingAfter.transform === openingStart.transform || openingAfter.progress <= openingStart.progress || !openingAfter.navScrolled) {
      fail(scope, "Opening scroll motion/progress did not update", { openingStart, openingAfter });
    }

    for (const id of chapterIds) {
      await page.evaluate(sectionId => {
        const el = document.getElementById(sectionId);
        if (!el) return;
        const r = el.getBoundingClientRect();
        const target = scrollY + r.top + Math.min(r.height * 0.25, innerHeight * 0.45) - innerHeight * 0.42;
        scrollTo(0, Math.max(0, Math.min(target, document.documentElement.scrollHeight - innerHeight)));
      }, id);
      await settle(page, 190);

      const state = await page.evaluate(() => {
        const sections = [...document.querySelectorAll("[data-chapter]")];
        const navHeight = document.querySelector(".site-nav")?.getBoundingClientRect().height || 0;
        const probe = Math.min(innerHeight * 0.5, Math.max(navHeight + 24, innerHeight * 0.32));
        const containing = sections.find(section => {
          const r = section.getBoundingClientRect();
          return r.top <= probe && r.bottom > probe;
        });
        const expected = containing || sections.reduce((closest, section) => {
          const distance = Math.abs(section.getBoundingClientRect().top - probe);
          if (!closest || distance < closest.distance) return { section, distance };
          return closest;
        }, null)?.section || sections[0];
        const expectedId = expected?.id || null;
        const rail = document.querySelector("[data-rail][aria-current='true']")?.getAttribute("href") || null;
        const expectedLight = (expected?.dataset.nav || "dark") === "light";
        const navLight = document.querySelector(".site-nav")?.classList.contains("is-light") || false;
        const meaningfulRevealMissing = [...expected.querySelectorAll("[data-reveal], .portrait-frame")].filter(el => {
          const r = el.getBoundingClientRect();
          const visiblePx = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
          const ratio = r.height > 0 ? visiblePx / Math.min(r.height, innerHeight) : 0;
          return ratio >= 0.20 && !el.classList.contains("is-visible");
        }).map(el => ({ tag: el.tagName, className: typeof el.className === "string" ? el.className : "" }));
        return { expectedId, rail, expectedLight, navLight, meaningfulRevealMissing };
      });
      if (state.rail !== `#${state.expectedId}`) fail(scope, "Active chapter state mismatch", state);
      if (state.navLight !== state.expectedLight) fail(scope, "Navigation theme mismatch", state);
      if (state.meaningfulRevealMissing.length) fail(scope, "Meaningfully visible reveal elements did not activate", state);

      if (id === "identity") {
        await page.locator(".portrait-frame img").scrollIntoViewIfNeeded();
        await settle(page, 180);
        const image = await page.evaluate(async () => {
          const img = document.querySelector(".portrait-frame img");
          try { if (img?.decode) await img.decode(); } catch {}
          return { complete: img?.complete || false, naturalWidth: img?.naturalWidth || 0, naturalHeight: img?.naturalHeight || 0 };
        });
        if (!image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) fail(scope, "Lazy portrait failed to load after entering viewport", image);
      }

      const layout = await getLayoutState(page);
      if (layout.documentScrollWidth > layout.viewportWidth + 1) fail(scope, "Horizontal overflow while chapter scrolling", { chapter: id, ...layout });
    }

    const workflowCount = await page.locator("[data-workflow-step]").count();
    for (let i = 0; i < workflowCount; i++) {
      await scrollItemToProbe(page, "[data-workflow-step]", i);
      const state = await expectedProbeState(page, "[data-workflow-step]", "workflowStep");
      if (state.active !== state.expected) fail(scope, "AI workflow active state disagrees with viewport probe", { index: i, ...state });
    }

    const journeyCount = await page.locator("[data-journey-event]").count();
    for (let i = 0; i < journeyCount; i++) {
      await scrollItemToProbe(page, "[data-journey-event]", i);
      const state = await expectedProbeState(page, "[data-journey-event]", "journeyYear");
      const current = await page.locator("[data-journey-current]").textContent();
      if (state.active !== state.expected || current?.trim() !== state.expected) fail(scope, "Journey active state disagrees with viewport probe", { index: i, current: current?.trim() || null, ...state });
    }

    if (viewport.width <= 1180) {
      await page.evaluate(() => scrollTo(0, 0));
      await settle(page, 90);
      const toggle = page.locator(".site-nav__menu-toggle");
      if (!(await toggle.isVisible())) {
        fail(scope, "Mobile menu toggle is not visible");
      } else {
        const box = await toggle.boundingBox();
        if (!box || box.height < 43.5 || box.width < 43.5) fail(scope, "Mobile menu touch target below 44px", box);
        await toggle.click();
        await settle(page, 100);
        const openState = await page.evaluate(() => ({
          expanded: document.querySelector(".site-nav__menu-toggle")?.getAttribute("aria-expanded"),
          hidden: document.querySelector(".mobile-menu")?.hidden,
          bodyOpen: document.body.classList.contains("menu-open"),
          mainInert: document.querySelector("#main-content")?.inert || false,
          mainAriaHidden: document.querySelector("#main-content")?.getAttribute("aria-hidden") || null,
          focusInside: document.querySelector(".mobile-menu")?.contains(document.activeElement) || false
        }));
        if (openState.expanded !== "true" || openState.hidden || !openState.bodyOpen || !openState.mainInert || openState.mainAriaHidden !== "true" || !openState.focusInside) fail(scope, "Mobile menu open/focus state failed", openState);
        await page.keyboard.press("Escape");
        await settle(page, 90);
        const closeState = await page.evaluate(() => ({
          expanded: document.querySelector(".site-nav__menu-toggle")?.getAttribute("aria-expanded"),
          hidden: document.querySelector(".mobile-menu")?.hidden,
          bodyOpen: document.body.classList.contains("menu-open"),
          focusOnToggle: document.activeElement === document.querySelector(".site-nav__menu-toggle")
        }));
        if (closeState.expanded !== "false" || !closeState.hidden || closeState.bodyOpen || !closeState.focusOnToggle) fail(scope, "Mobile menu close/focus state failed", closeState);
      }
    }

    await page.setViewportSize({ width: 844, height: 390 }); await settle(page, 130);
    await page.setViewportSize({ width: 1024, height: 768 }); await settle(page, 130);
    await page.setViewportSize({ width: viewport.width, height: viewport.height }); await settle(page, 130);
    const resizeLayout = await getLayoutState(page);
    const menuOpen = await page.evaluate(() => document.body.classList.contains("menu-open"));
    if (resizeLayout.documentScrollWidth > resizeLayout.viewportWidth + 1 || menuOpen) fail(scope, "Resize/orientation stress left invalid state", { menuOpen, ...resizeLayout });

    const sticky = await page.evaluate(() => [...document.querySelectorAll("body *")].filter(el => {
      const s = getComputedStyle(el); const r = el.getBoundingClientRect();
      return s.position === "sticky" && s.display !== "none" && s.visibility !== "hidden" && r.width > 1 && r.height > 1;
    }).map(el => {
      const r = el.getBoundingClientRect();
      return { tag: el.tagName, id: el.id || "", className: typeof el.className === "string" ? el.className : "", left: r.left, right: r.right, width: r.width, height: r.height };
    }));
    for (const item of sticky) if (item.left < -2 || item.right > viewport.width + 2) fail(scope, "Visible sticky element geometry invalid", item);

    await page.evaluate(() => scrollTo(0, 0)); await settle(page, 80);
    await page.screenshot({ path: path.join(OUTPUT, `${locale}-${viewport.name}-top.png`), fullPage: false });
    results.push({ scope, initialLayout, openingAfter, stickyCount: sticky.length });
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
    await settle(page, 60);

    const audit = await page.evaluate(({ headingSelectors, proseSelectors }) => {
      const viewportWidth = document.documentElement.clientWidth;
      const visible = el => { const s=getComputedStyle(el); const r=el.getBoundingClientRect(); return s.display!=="none" && s.visibility!=="hidden" && r.width>0 && r.height>0; };
      const collectLines = el => {
        const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT); const tokens=[]; const splitTokens=[]; let node;
        while ((node=walker.nextNode())) {
          const text=node.textContent||"";
          for (const match of text.matchAll(/\S+/gu)) {
            const range=document.createRange(); range.setStart(node,match.index); range.setEnd(node,match.index+match[0].length);
            const rects=[...range.getClientRects()].filter(r=>r.width>.5&&r.height>.5); if(!rects.length) continue;
            const tops=[]; for(const r of rects) if(!tops.some(t=>Math.abs(t-r.top)<1.5)) tops.push(r.top);
            if(tops.length>1) splitTokens.push(match[0]);
            for(const r of rects) tokens.push({token:match[0],top:r.top,left:r.left,right:r.right,outside:r.left < -1 || r.right > viewportWidth + 1});
          }
        }
        tokens.sort((a,b)=>a.top-b.top||a.left-b.left); const lines=[];
        for(const item of tokens){let line=lines.find(x=>Math.abs(x.top-item.top)<2); if(!line){line={top:item.top,tokens:[],left:item.left,right:item.right};lines.push(line);} line.tokens.push(item.token);line.left=Math.min(line.left,item.left);line.right=Math.max(line.right,item.right);}
        lines.sort((a,b)=>a.top-b.top);
        return {lines:lines.map(x=>({tokens:x.tokens,width:x.right-x.left})),splitTokens,outside:tokens.filter(x=>x.outside).map(x=>x.token)};
      };
      const scan = selectors => selectors.flatMap(selector => [...document.querySelectorAll(selector)].filter(visible).map((el,index)=>{
        const r=el.getBoundingClientRect(); const flow=collectLines(el);
        return {selector,index,text:(el.textContent||"").trim().replace(/\s+/g," "),clientWidth:el.clientWidth,scrollWidth:el.scrollWidth,rect:{left:r.left,right:r.right},...flow};
      }));
      return {viewportWidth,documentScrollWidth:document.documentElement.scrollWidth,headings:scan(headingSelectors),prose:scan(proseSelectors)};
    }, { headingSelectors, proseSelectors });

    if (audit.documentScrollWidth > audit.viewportWidth + 1) {
      const layout = await getLayoutState(page);
      fail(scope, "Document overflow", layout);
    }
    for (const item of audit.headings) {
      const hardSplits = item.splitTokens.filter(value => !value.includes("-") && !value.includes("/"));
      if (item.scrollWidth > item.clientWidth + 2 || item.rect.left < -1 || item.rect.right > audit.viewportWidth + 1 || item.outside.length || hardSplits.length) fail(scope, "Heading flow break", { ...item, splitTokens: hardSplits });
      item.lines.forEach((line,lineIndex)=>{
        const normalized=line.tokens.map(normalizeToken).filter(Boolean);
        if(normalized.length===1 && weakWords[locale].has(normalized[0])) fail(scope,"Isolated weak word",{selector:item.selector,index:item.index,lineIndex,line});
        if(normalized.length===1 && normalized[0].length===1 && !/^\d$/u.test(normalized[0])) fail(scope,"Isolated single letter",{selector:item.selector,index:item.index,lineIndex,line});
      });
      if(item.lines.length>=7) fail(scope,"Excessive heading line count",{selector:item.selector,index:item.index,lineCount:item.lines.length,text:item.text});
    }
    for(const item of audit.prose){
      const hardSplits=item.splitTokens.filter(value=>!value.includes("-")&&!value.includes("/"));
      if(item.scrollWidth>item.clientWidth+2||item.outside.length||hardSplits.length) fail(scope,"Prose flow break",{...item,splitTokens:hardSplits});
    }
    results.push({ scope, textAudit:{ width, headingCount:audit.headings.length, proseCount:audit.prose.length } });
    flushDiagnostics();
  } catch (error) {
    fail(scope, "Unhandled text-flow QA exception", String(error?.stack || error));
    flushDiagnostics();
  } finally {
    await context.close();
  }
}

const browser = await browserType.launch({ headless: true });
try {
  for (const locale of locales) {
    for (const viewport of interactionViewports) await runInteraction(browser, locale, viewport);
    for (const width of textWidths) await runTextAudit(browser, locale, width);
  }
} finally {
  await browser.close();
}

const report = { browser:BROWSER_NAME, generatedAt:new Date().toISOString(), failureCount:failures.length, failures, results, interactionViewports, textWidths, locales };
fs.writeFileSync(path.join(OUTPUT,"cross-browser-report.json"),JSON.stringify(report,null,2));
fs.writeFileSync(path.join(OUTPUT,"cross-browser-summary.txt"),`Cross-browser QA\nBrowser: ${BROWSER_NAME}\nFailures: ${failures.length}\nLocales: ${locales.join(", ")}\nInteraction viewports: ${interactionViewports.map(v=>`${v.width}x${v.height}`).join(", ")}\nText widths: ${textWidths.join(", ")}\n`);
if(failures.length){console.error(`FAIL: ${BROWSER_NAME} cross-browser QA found ${failures.length} issue(s).`);console.error(JSON.stringify(failures.slice(0,160),null,2));process.exit(1);}
console.log(`PASS: ${BROWSER_NAME} cross-browser QA completed with 0 failures.`);
