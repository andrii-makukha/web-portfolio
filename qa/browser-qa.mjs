import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const ORIGIN = process.env.QA_ORIGIN || "http://127.0.0.1:4173";
const OUTPUT = path.resolve("qa-output");
fs.mkdirSync(OUTPUT, { recursive: true });

const locales = ["de", "en", "ru"];
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "tablet", width: 1024, height: 900 },
  { name: "mobile", width: 360, height: 800, isMobile: true, hasTouch: true }
];
const coreIds = ["top", "identity", "profile", "foundation", "capabilities", "ai", "work", "journey", "languages", "contact"];

const failures = [];
const results = [];

function recordFailure(scope, message, data = null) {
  failures.push({ scope, message, data });
}

async function settle(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function runPage(browser, locale, viewport) {
  const scope = `${locale}/${viewport.name}`;
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: Boolean(viewport.isMobile),
    hasTouch: Boolean(viewport.hasTouch),
    reducedMotion: "no-preference"
  });

  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const badResponses = [];
  const failedRequests = [];

  page.on("console", msg => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", err => pageErrors.push(String(err)));
  page.on("requestfailed", req => failedRequests.push({ url: req.url(), error: req.failure()?.errorText || "unknown" }));
  page.on("response", response => {
    const url = response.url();
    if (url.startsWith(ORIGIN) && response.status() >= 400 && !url.endsWith("/favicon.ico")) {
      badResponses.push({ url, status: response.status() });
    }
  });

  await page.addInitScript(() => {
    window.__qaCLS = 0;
    try {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__qaCLS += entry.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {}
  });

  const response = await page.goto(`${ORIGIN}/${locale}/`, { waitUntil: "networkidle", timeout: 30000 });
  // qa-deterministic-scroll: this affects the automated browser only, not production CSS.
  await page.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
  if (!response || !response.ok()) {
    recordFailure(scope, "Document did not return a successful response", response?.status() ?? null);
  }
  await settle(page);

  const base = await page.evaluate((expectedIds) => {
    const ids = [...document.querySelectorAll("[id]")].map(el => el.id);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    const anchors = [...document.querySelectorAll('a[href^="#"]')];
    const missingAnchors = anchors
      .map(a => a.getAttribute("href"))
      .filter(Boolean)
      .filter(href => href !== "#" && !document.querySelector(href));
    const images = [...document.images].map(img => ({
      src: img.getAttribute("src"),
      complete: img.complete,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      alt: img.getAttribute("alt")
    }));
    const blankButtons = [...document.querySelectorAll("button")].filter(button => !(button.textContent || "").trim() && !button.getAttribute("aria-label")).length;
    const targetBlankWithoutRel = [...document.querySelectorAll('a[target="_blank"]')].filter(a => {
      const rel = (a.getAttribute("rel") || "").split(/\s+/);
      return !rel.includes("noopener");
    }).map(a => a.href);
    const h1s = document.querySelectorAll("h1").length;
    const skipLink = document.querySelector(".skip-link");
    const mainContent = document.querySelector("#main-content");
    const mobileCapabilitiesLink = document.querySelector('.mobile-menu a[href="#capabilities"]');
    const externalResources = performance.getEntriesByType("resource")
      .map(entry => entry.name)
      .filter(url => {
        try { return new URL(url).origin !== location.origin; } catch { return true; }
      });
    return {
      title: document.title,
      lang: document.documentElement.lang,
      h1s,
      skipNavigation: {
        exists: Boolean(skipLink),
        href: skipLink?.getAttribute("href") || null,
        mainExists: Boolean(mainContent),
        mainTabIndex: mainContent?.getAttribute("tabindex") || null
      },
      mobileCapabilitiesLink: Boolean(mobileCapabilitiesLink),
      missingCoreIds: expectedIds.filter(id => !document.getElementById(id)),
      duplicateIds: [...new Set(duplicateIds)],
      missingAnchors: [...new Set(missingAnchors)],
      images,
      blankButtons,
      targetBlankWithoutRel,
      externalResources,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      overflowDiagnostics: {
        html: {
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          offsetWidth: document.documentElement.offsetWidth
        },
        body: {
          clientWidth: document.body.clientWidth,
          scrollWidth: document.body.scrollWidth,
          offsetWidth: document.body.offsetWidth,
          rectWidth: Math.round(document.body.getBoundingClientRect().width)
        },
        main: (() => {
          const el = document.querySelector("main");
          return el ? {
            clientWidth: el.clientWidth,
            scrollWidth: el.scrollWidth,
            offsetWidth: el.offsetWidth,
            rectWidth: Math.round(el.getBoundingClientRect().width)
          } : null;
        })(),
        sections: [...document.querySelectorAll("[data-chapter]")].map(el => ({
          id: el.id,
          clientWidth: el.clientWidth,
          scrollWidth: el.scrollWidth,
          offsetWidth: el.offsetWidth,
          rectWidth: Math.round(el.getBoundingClientRect().width),
          overflowX: getComputedStyle(el).overflowX
        })).filter(x => x.scrollWidth > x.clientWidth + 1),
        internal: [...document.querySelectorAll("body *")].map(el => {
          const rect = el.getBoundingClientRect();
          return {
            tag: el.tagName,
            id: el.id || "",
            className: typeof el.className === "string" ? el.className : "",
            clientWidth: el.clientWidth,
            scrollWidth: el.scrollWidth,
            rectWidth: Math.round(rect.width),
            overflowX: getComputedStyle(el).overflowX
          };
        }).filter(x => x.clientWidth > 0 && x.scrollWidth > x.clientWidth + 1).slice(0, 40)
      },
      overflowOffenders: [...document.querySelectorAll("body *")]
        .filter(el => {
          const style = getComputedStyle(el);
          if (style.position === "fixed" && style.display === "none") return false;
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && (rect.left < -1 || rect.right > document.documentElement.clientWidth + 1);
        })
        .slice(0, 20)
        .map(el => {
          const rect = el.getBoundingClientRect();
          return {
            tag: el.tagName,
            className: typeof el.className === "string" ? el.className : "",
            text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 120),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width)
          };
        })
    };
  }, coreIds);

  if (base.h1s !== 1) recordFailure(scope, "Expected exactly one H1", base.h1s);
  if (!base.skipNavigation.exists || !base.skipNavigation.mainExists || base.skipNavigation.href !== "#main-content" || base.skipNavigation.mainTabIndex !== "-1") {
    recordFailure(scope, "Skip navigation is incomplete", base.skipNavigation);
  }
  if (!base.mobileCapabilitiesLink) recordFailure(scope, "Mobile navigation is missing the capabilities chapter");
  if (base.missingCoreIds.length) recordFailure(scope, "Missing core section IDs", base.missingCoreIds);
  if (base.duplicateIds.length) recordFailure(scope, "Duplicate IDs", base.duplicateIds);
  if (base.missingAnchors.length) recordFailure(scope, "Broken internal anchors", base.missingAnchors);
  if (base.blankButtons) recordFailure(scope, "Buttons without accessible text", base.blankButtons);
  if (base.targetBlankWithoutRel.length) recordFailure(scope, "target=_blank links without noopener", base.targetBlankWithoutRel);
  if (base.externalResources.length) recordFailure(scope, "Unexpected third-party runtime resources", base.externalResources);
  if (base.scrollWidth > base.clientWidth + 1) recordFailure(scope, "Horizontal overflow at initial render", {
    scrollWidth: base.scrollWidth,
    clientWidth: base.clientWidth,
    offenders: base.overflowOffenders,
    diagnostics: base.overflowDiagnostics
  });

  for (const image of base.images) {
    if (!image.alt) recordFailure(scope, "Image missing alt text", image.src);
    if (!image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
      recordFailure(scope, "Image failed to load", image);
    }
  }

  if (viewport.width > 900) {
    const editorialOverlaps = await page.evaluate(() => {
      const pairs = [
        [".profile__display", ".profile__lead"],
        [".foundation__display", ".foundation__lead"],
        [".capabilities__display", ".capabilities__lead"],
        [".ai__display", ".ai__lead"],
        [".work__display", ".work__lead"],
        [".journey__display", ".journey__lead"],
        [".languages__display", ".languages__lead"]
      ];
      const overlaps = [];
      for (const [headlineSelector, leadSelector] of pairs) {
        const headline = document.querySelector(headlineSelector);
        const lead = document.querySelector(leadSelector);
        if (!headline || !lead) continue;
        const a = headline.getBoundingClientRect();
        const b = lead.getBoundingClientRect();
        const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
        const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        if (x > 1 && y > 1) {
          overlaps.push({
            headlineSelector,
            leadSelector,
            intersectionWidth: Math.round(x),
            intersectionHeight: Math.round(y),
            headline: { left: Math.round(a.left), right: Math.round(a.right), top: Math.round(a.top), bottom: Math.round(a.bottom) },
            lead: { left: Math.round(b.left), right: Math.round(b.right), top: Math.round(b.top), bottom: Math.round(b.bottom) }
          });
        }
      }
      return overlaps;
    });
    if (editorialOverlaps.length) {
      recordFailure(scope, "Editorial heading/lead overlap", editorialOverlaps);
    }

    const headlineOverflow = await page.evaluate(() => {
      const selectors = [
        ".profile__display",
        ".foundation__display",
        ".capabilities__display",
        ".ai__display",
        ".work__display",
        ".journey__display",
        ".languages__display"
      ];
      return selectors.flatMap(selector => {
        const headline = document.querySelector(selector);
        if (!headline) return [];
        const available = headline.clientWidth;
        return [...headline.querySelectorAll(":scope > span")]
          .map((line, index) => ({
            selector,
            index,
            text: (line.textContent || "").trim(),
            available,
            scrollWidth: line.scrollWidth,
            clientWidth: line.clientWidth
          }))
          .filter(line => line.scrollWidth > available + 2);
      });
    });
    if (headlineOverflow.length) {
      recordFailure(scope, "Editorial headline line exceeds its column", headlineOverflow);
    }
  }

  if (viewport.width <= 1180) {
    const toggle = page.locator(".site-nav__menu-toggle");
    if (!(await toggle.isVisible())) {
      recordFailure(scope, "Responsive menu toggle is not visible");
    } else {
      const box = await toggle.boundingBox();
      if (!box || box.height < 44) recordFailure(scope, "Menu toggle touch target is below 44px", box);
      let menuClickWorked = true;
      try {
        await toggle.click({ timeout: 4000 });
      } catch (error) {
        menuClickWorked = false;
        recordFailure(scope, "Responsive menu click was blocked", String(error));
      }
      await settle(page);
      const openState = await page.evaluate(() => ({
        expanded: document.querySelector(".site-nav__menu-toggle")?.getAttribute("aria-expanded"),
        hidden: document.querySelector(".mobile-menu")?.hidden,
        bodyOpen: document.body.classList.contains("menu-open"),
        activeTag: document.activeElement?.tagName,
        activeHref: document.activeElement?.getAttribute?.("href"),
        mainInert: document.querySelector("#main-content")?.inert || false,
        mainAriaHidden: document.querySelector("#main-content")?.getAttribute("aria-hidden") || null,
        toggleText: (document.querySelector(".site-nav__menu-toggle")?.textContent || "").trim(),
        closeLabel: document.querySelector(".site-nav__menu-toggle")?.dataset.closeLabel || ""
      }));
      if (viewport.name === "mobile" && menuClickWorked) {
        await page.screenshot({ path: path.join(OUTPUT, `${locale}-mobile-menu-open.png`), fullPage: false });
      }
      if (menuClickWorked && (
        openState.expanded !== "true" ||
        openState.hidden ||
        !openState.bodyOpen ||
        !openState.mainInert ||
        openState.mainAriaHidden !== "true" ||
        openState.toggleText !== openState.closeLabel
      )) {
        recordFailure(scope, "Responsive menu did not open correctly", openState);
      }
      if (menuClickWorked) await page.keyboard.press("Escape");
      await settle(page);
      const closeState = await page.evaluate(() => ({
        expanded: document.querySelector(".site-nav__menu-toggle")?.getAttribute("aria-expanded"),
        hidden: document.querySelector(".mobile-menu")?.hidden,
        bodyOpen: document.body.classList.contains("menu-open"),
        focusOnToggle: document.activeElement === document.querySelector(".site-nav__menu-toggle"),
        mainInert: document.querySelector("#main-content")?.inert || false,
        mainAriaHidden: document.querySelector("#main-content")?.getAttribute("aria-hidden") || null,
        toggleText: (document.querySelector(".site-nav__menu-toggle")?.textContent || "").trim(),
        openLabel: document.querySelector(".site-nav__menu-toggle")?.dataset.openLabel || ""
      }));
      if (menuClickWorked && (
        closeState.expanded !== "false" ||
        !closeState.hidden ||
        closeState.bodyOpen ||
        !closeState.focusOnToggle ||
        closeState.mainInert ||
        closeState.mainAriaHidden !== null ||
        closeState.toggleText !== closeState.openLabel
      )) {
        recordFailure(scope, "Responsive menu did not close/focus correctly", closeState);
      }

      const touchTargets = await page.evaluate(() => {
        const selectors = [
          ".site-nav__mark",
          ".site-nav__languages a",
          ".site-nav__menu-toggle",
          ".opening__scroll",
          ".identity__actions a",
          ".digital-card__links a",
          ".contact__footer a"
        ];
        return selectors.flatMap(selector => [...document.querySelectorAll(selector)])
          .filter(el => {
            const style = getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
          })
          .map(el => {
            const rect = el.getBoundingClientRect();
            return { selector: el.className || el.tagName, text: (el.textContent || "").trim().slice(0, 80), width: rect.width, height: rect.height };
          });
      });
      for (const target of touchTargets) {
        if (target.height < 43.5) recordFailure(scope, "Touch target below 44px", target);
      }
    }
  } else {
    const centerVisible = await page.locator(".site-nav__center").isVisible();
    if (!centerVisible) recordFailure(scope, "Desktop navigation unexpectedly hidden");
  }

  // Chapter-state regression check: verify rail + nav theme in both scroll directions.
  if (viewport.name === "desktop" || viewport.name === "mobile") {
    const chapterOrder = [...coreIds, ...coreIds.slice().reverse()];
    for (const id of chapterOrder) {
      await page.evaluate(sectionId => {
        const el = document.getElementById(sectionId);
        if (!el) return;
        const navOffset = 74;
        window.scrollTo(0, Math.max(0, el.getBoundingClientRect().top + window.scrollY - navOffset));
      }, id);
      await page.waitForTimeout(45);

      const chapterState = await page.evaluate(sectionId => {
        const section = document.getElementById(sectionId);
        return {
          current: document.querySelector("[data-rail][aria-current='true']")?.getAttribute("href") || null,
          expectedTheme: section?.dataset.nav || "dark",
          navIsLight: document.querySelector(".site-nav")?.classList.contains("is-light") || false
        };
      }, id);

      if (chapterState.current !== "#" + id) {
        recordFailure(scope, "Active chapter did not follow scroll position", { id, ...chapterState });
      }

      const shouldBeLight = chapterState.expectedTheme === "light";
      if (chapterState.navIsLight !== shouldBeLight) {
        recordFailure(scope, "Navigation theme did not match active chapter", { id, ...chapterState });
      }
    }
  }

  const totalHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const step = Math.max(320, Math.floor(viewport.height * 0.78));
  let overflowDuringScroll = null;

  for (let y = 0; y <= totalHeight; y += step) {
    await page.evaluate(scrollY => window.scrollTo(0, scrollY), y);
    await page.waitForTimeout(18);
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));
    if (overflow.scrollWidth > overflow.clientWidth + 1) {
      overflowDuringScroll = { y, ...overflow };
      break;
    }
  }
  if (overflowDuringScroll) recordFailure(scope, "Horizontal overflow appeared while scrolling", overflowDuringScroll);

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await settle(page);

  const endState = await page.evaluate(() => ({
    cls: Number((window.__qaCLS || 0).toFixed(4)),
    activeRail: document.querySelector("[data-rail][aria-current='true']")?.getAttribute("href") || null,
    pageProgress: getComputedStyle(document.documentElement).getPropertyValue("--page-progress").trim(),
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));

  if (endState.cls > 0.12) recordFailure(scope, "Cumulative Layout Shift exceeded 0.12", endState.cls);
  if (endState.scrollWidth > endState.clientWidth + 1) recordFailure(scope, "Horizontal overflow at end of page", endState);

  const performanceState = await page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0];
    const resources = performance.getEntriesByType("resource").filter(entry => {
      try { return new URL(entry.name).origin === location.origin; } catch { return false; }
    });
    const encodedBytes =
      (navigation?.encodedBodySize || 0) +
      resources.reduce((sum, entry) => sum + (entry.encodedBodySize || 0), 0);
    const transferBytes =
      (navigation?.transferSize || 0) +
      resources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0);
    const portrait = document.querySelector(".portrait-frame img");
    const portraitRect = portrait?.getBoundingClientRect();
    return {
      encodedBytes,
      transferBytes,
      resourceCount: resources.length,
      domNodes: document.getElementsByTagName("*").length,
      portrait: portrait ? {
        naturalWidth: portrait.naturalWidth,
        naturalHeight: portrait.naturalHeight,
        renderedWidth: Math.round(portraitRect?.width || 0),
        renderedHeight: Math.round(portraitRect?.height || 0)
      } : null
    };
  });

  if (performanceState.encodedBytes > 256000) {
    recordFailure(scope, "Performance budget exceeded", performanceState);
  }
  if (performanceState.domNodes > 1200) {
    recordFailure(scope, "DOM complexity budget exceeded", performanceState);
  }
  if (
    performanceState.portrait &&
    performanceState.portrait.renderedWidth > 0 &&
    performanceState.portrait.naturalWidth < performanceState.portrait.renderedWidth
  ) {
    recordFailure(scope, "Portrait is being upscaled beyond its natural width", performanceState.portrait);
  }

  if (consoleErrors.length) recordFailure(scope, "Console errors", consoleErrors);
  if (pageErrors.length) recordFailure(scope, "Page errors", pageErrors);
  if (badResponses.length) recordFailure(scope, "Bad same-origin responses", badResponses);
  if (failedRequests.length) recordFailure(scope, "Failed requests", failedRequests);

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(40);
  await page.screenshot({ path: path.join(OUTPUT, `${locale}-${viewport.name}-top.png`), fullPage: false });

  if (viewport.name === "desktop" || viewport.name === "mobile") {
    for (const id of ["identity", "profile", "foundation", "capabilities", "ai", "work", "journey", "languages", "contact"]) {
      await page.evaluate(sectionId => {
        const el = document.getElementById(sectionId);
        if (!el) return;
        const navOffset = 74;
        window.scrollTo(0, Math.max(0, el.getBoundingClientRect().top + window.scrollY - navOffset));
      }, id);
      await page.waitForTimeout(80);
      await page.screenshot({ path: path.join(OUTPUT, `${locale}-${viewport.name}-${id}-view.png`), fullPage: false });
    }
  }

  results.push({ scope, base, endState, performanceState, consoleErrors, pageErrors, badResponses, failedRequests });
  await context.close();
}

const browser = await chromium.launch({ headless: true });

async function runPageSafe(locale, viewport) {
  try {
    await runPage(browser, locale, viewport);
  } catch (error) {
    recordFailure(`${locale}/${viewport.name}`, "Unhandled browser QA exception", String(error?.stack || error));
    results.push({ scope: `${locale}/${viewport.name}`, unhandledError: String(error?.stack || error) });
  }
}

for (const locale of locales) {
  for (const viewport of viewports) {
    await runPageSafe(locale, viewport);
  }
}

{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(`${ORIGIN}/de/`, { waitUntil: "networkidle" });
  await settle(page);
  const reduced = await page.evaluate(() => {
    const visible = selector => [...document.querySelectorAll(selector)].every(el => {
      const style = getComputedStyle(el);
      return Number(style.opacity) >= 0.99 && style.transform === "none";
    });
    return {
      reveals: visible("[data-reveal]"),
      workflow: visible(".workflow-step"),
      journey: visible(".journey-event"),
      smoothScroll: getComputedStyle(document.documentElement).scrollBehavior
    };
  });
  if (!reduced.reveals || !reduced.workflow || !reduced.journey || reduced.smoothScroll !== "auto") {
    recordFailure("reduced-motion", "Reduced motion fallback is not fully visible/static", reduced);
  }
  results.push({ scope: "reduced-motion", reduced });
  await context.close();
}

{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${ORIGIN}/de/#foundation`, { waitUntil: "networkidle" });
  await page.locator('.site-nav__languages a[data-lang="en"]').click();
  await page.waitForURL(url => url.pathname.endsWith("/en/") && url.hash === "#foundation", { timeout: 10000 });
  const switched = new URL(page.url());
  if (!switched.pathname.endsWith("/en/") || switched.hash !== "#foundation") {
    recordFailure("language-switch", "Language switching did not preserve the current section", page.url());
  }
  results.push({ scope: "language-switch", url: page.url() });
  await context.close();
}

await browser.close();

const report = {
  generatedAt: new Date().toISOString(),
  commitSha: process.env.GITHUB_SHA || null,
  origin: ORIGIN,
  testedLocales: locales,
  testedViewports: viewports,
  failureCount: failures.length,
  failures,
  results
};

fs.writeFileSync(path.join(OUTPUT, "browser-qa-report.json"), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(OUTPUT, "browser-qa-summary.txt"), failures.length
  ? `FAIL: ${failures.length} issue(s)\n${failures.map((f, i) => `${i + 1}. [${f.scope}] ${f.message} ${f.data ? JSON.stringify(f.data) : ""}`).join("\n")}\n`
  : "PASS: all automated browser QA checks passed.\n"
);

console.log("\n=== Portfolio v2 Browser QA ===");
console.log(`Locales: ${locales.join(", ")}`);
console.log(`Viewports: ${viewports.map(v => `${v.name}(${v.width}x${v.height})`).join(", ")}`);
console.log(`Failures: ${failures.length}`);
for (const failure of failures) {
  console.log(`- [${failure.scope}] ${failure.message}`, failure.data ?? "");
}

if (failures.length) process.exitCode = 1;
