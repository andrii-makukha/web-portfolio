import { firefox, webkit } from "playwright";
import fs from "node:fs";
import path from "node:path";

const ORIGIN = process.env.QA_ORIGIN || "http://127.0.0.1:4173";
const NAME = process.env.QA_BROWSER || "webkit";
const TYPE = { firefox, webkit }[NAME];
if (!TYPE) throw new Error(`Unsupported QA_BROWSER=${NAME}`);

const OUT = path.resolve("qa-output", "cross-browser", NAME);
fs.mkdirSync(OUT, { recursive: true });

const LOCALES = ["de", "en", "ru"];
const INTERACTION = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "macbook14", width: 1512, height: 982 },
  { name: "mobile", width: 390, height: 844 }
];
const WIDTHS = [320, 360, 390, 430, 560, 768, 1024, 1440, 1512, 1728];
const CHAPTERS = ["top", "identity", "profile", "foundation", "capabilities", "ai", "work", "journey", "languages", "contact"];

const HEADINGS = [
  ".opening__name", ".identity__title", ".profile__display", ".foundation__display",
  ".foundation__closing", ".capabilities__display", ".capability-row__evidence strong",
  ".capability-row__result h3", ".capabilities__bridge", ".ai__display", ".workflow-step h3",
  ".ai-formula", ".ai-proof > h3", ".work__display", ".work-case__story h3",
  ".symbioz-grid__story h3", ".digital-work__intro h3", ".digital-card h4",
  ".work__closing > div", ".journey__display", ".journey-event__content h3",
  ".journey-ending", ".journey-education > h3", ".languages__display",
  ".language-row strong", ".contact__display"
];
const PROSE = [
  ".identity__statement", ".profile__lead", ".foundation__lead", ".capabilities__lead",
  ".capability-row__result p", ".ai__subheadline", ".ai__intro > p:not(.ai__subheadline)",
  ".workflow-step p", ".ai-proof details > p", ".work__lead", ".work-case__subtitle",
  ".work-case__body", ".symbioz-grid__story p", ".digital-work__intro > div",
  ".digital-card > p", ".journey__lead", ".journey-event__body", ".languages__lead"
];
const WEAK = {
  de: new Set(["und","oder","aber","denn","im","in","am","an","auf","aus","bei","für","mit","nach","von","vor","zu","zur","zum","der","die","das","ein","eine"]),
  en: new Set(["and","or","but","the","a","an","to","of","in","on","for","with","at","by","from"]),
  ru: new Set(["и","а","но","в","во","на","из","к","ко","с","со","у","о","об","от","до","по","за","для","не"])
};

const failures = [];
const results = [];
const fail = (scope, message, data = null) => failures.push({ browser: NAME, scope, message, data });
const clean = value => value.toLocaleLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");

async function settle(page, ms = 150) {
  await page.waitForTimeout(ms);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

function diagnostics(page, scope) {
  const consoleErrors = [], pageErrors = [], failedRequests = [], badResponses = [];
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

async function chapterState(page) {
  return page.evaluate(() => {
    const sections = [...document.querySelectorAll("[data-chapter]")];
    const navHeight = document.querySelector(".site-nav")?.getBoundingClientRect().height || 0;
    const probe = Math.min(innerHeight * .5, Math.max(navHeight + 24, innerHeight * .32));
    const expected = sections.find(section => {
      const r = section.getBoundingClientRect();
      return r.top <= probe && r.bottom > probe;
    }) || sections.reduce((best, section) => {
      const distance = Math.abs(section.getBoundingClientRect().top - probe);
      return !best || distance < best.distance ? { section, distance } : best;
    }, null)?.section;
    return {
      expected: expected?.id || null,
      rail: document.querySelector("[data-rail][aria-current='true']")?.getAttribute("href") || null,
      expectedLight: (expected?.dataset.nav || "dark") === "light",
      navLight: document.querySelector(".site-nav")?.classList.contains("is-light") || false
    };
  });
}

async function scrollToItemProbe(page, selector, index) {
  await page.evaluate(({ selector, index }) => {
    const el = document.querySelectorAll(selector)[index];
    if (!el) return;
    const r = el.getBoundingClientRect();
    const center = scrollY + r.top + r.height / 2;
    scrollTo(0, Math.max(0, Math.min(center - innerHeight * .5, document.documentElement.scrollHeight - innerHeight)));
  }, { selector, index });
  await settle(page, 180);
}

async function probeState(page, selector, key) {
  return page.evaluate(({ selector, key }) => {
    const items = [...document.querySelectorAll(selector)];
    const probe = innerHeight * .5;
    const expected = items.find(item => {
      const r = item.getBoundingClientRect();
      return r.top <= probe && r.bottom > probe;
    }) || items.reduce((best, item) => {
      const r = item.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - probe);
      return !best || d < best.distance ? { item, distance: d } : best;
    }, null)?.item;
    const active = items.find(item => item.classList.contains("is-active"));
    return { expected: expected?.dataset?.[key] || null, active: active?.dataset?.[key] || null };
  }, { selector, key });
}

async function runInteraction(browser, locale, vp) {
  const scope = `${locale}/${vp.name}`;
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, reducedMotion: "no-preference" });
  const page = await context.newPage();
  const flush = diagnostics(page, scope);
  try {
    const response = await page.goto(`${ORIGIN}/${locale}/`, { waitUntil: "networkidle", timeout: 30000 });
    if (!response?.ok()) fail(scope, "Document response failed", response?.status() ?? null);
    await page.evaluate(() => document.fonts?.ready);
    await page.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
    await settle(page, 180);

    const support = await page.evaluate(() => ({
      sticky: CSS.supports("position", "sticky"),
      clip: CSS.supports("clip-path", "inset(0 0 0 0)"),
      portraitClip: getComputedStyle(document.querySelector(".portrait-frame")).clipPath,
      external: performance.getEntriesByType("resource").map(e => e.name).filter(url => {
        try { return new URL(url).origin !== location.origin; } catch { return true; }
      })
    }));
    if (!support.sticky) fail(scope, "CSS sticky unsupported");
    if (!support.clip || support.portraitClip === "none") fail(scope, "Portrait clip-path inactive", support);
    if (support.external.length) fail(scope, "Unexpected external runtime resources", support.external);

    const opening0 = await page.evaluate(() => ({
      transform: getComputedStyle(document.querySelector(".opening__name")).transform,
      progress: parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--page-progress")) || 0
    }));
    await page.evaluate(() => scrollTo(0, Math.round(innerHeight * .62)));
    await settle(page, 180);
    const opening1 = await page.evaluate(() => ({
      transform: getComputedStyle(document.querySelector(".opening__name")).transform,
      progress: parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--page-progress")) || 0,
      navScrolled: document.querySelector(".site-nav")?.classList.contains("is-scrolled") || false
    }));
    if (opening1.transform === opening0.transform || opening1.progress <= opening0.progress || !opening1.navScrolled) {
      fail(scope, "Opening scroll state did not update", { opening0, opening1 });
    }

    for (const id of CHAPTERS) {
      await page.evaluate(id => {
        const el = document.getElementById(id); if (!el) return;
        const r = el.getBoundingClientRect();
        const target = scrollY + r.top + Math.min(r.height * .25, innerHeight * .45) - innerHeight * .42;
        scrollTo(0, Math.max(0, Math.min(target, document.documentElement.scrollHeight - innerHeight)));
      }, id);
      await settle(page, 220);
      const state = await chapterState(page);
      if (state.rail !== `#${state.expected}`) fail(scope, "Chapter rail mismatch", { requested: id, ...state });
      if (state.navLight !== state.expectedLight) fail(scope, "Navigation theme mismatch", { requested: id, ...state });

      const reveal = await page.evaluate(() => {
        const section = [...document.querySelectorAll("[data-chapter]")].find(s => {
          const navH = document.querySelector(".site-nav")?.getBoundingClientRect().height || 0;
          const probe = Math.min(innerHeight * .5, Math.max(navH + 24, innerHeight * .32));
          const r = s.getBoundingClientRect(); return r.top <= probe && r.bottom > probe;
        });
        if (!section) return [];
        return [...section.querySelectorAll("[data-reveal], .portrait-frame")].filter(el => {
          const r = el.getBoundingClientRect();
          const visiblePx = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
          const ratio = r.height > 0 ? visiblePx / r.height : 0;
          return ratio >= .20 && !el.classList.contains("is-visible");
        }).map(el => ({ tag: el.tagName, className: typeof el.className === "string" ? el.className : "" }));
      });
      if (reveal.length) fail(scope, "Visible reveal did not activate", { requested: id, reveal });

      if (id === "identity") {
        await page.locator(".portrait-frame img").scrollIntoViewIfNeeded(); await settle(page, 180);
        const image = await page.evaluate(async () => {
          const img = document.querySelector(".portrait-frame img");
          try { await img?.decode?.(); } catch {}
          return { complete: !!img?.complete, naturalWidth: img?.naturalWidth || 0 };
        });
        if (!image.complete || image.naturalWidth <= 0) fail(scope, "Lazy portrait failed after viewport entry", image);
      }
    }

    for (let i = 0, n = await page.locator("[data-workflow-step]").count(); i < n; i++) {
      await scrollToItemProbe(page, "[data-workflow-step]", i);
      const state = await probeState(page, "[data-workflow-step]", "workflowStep");
      if (state.active !== state.expected) fail(scope, "Workflow state mismatch", { index: i, ...state });
    }
    for (let i = 0, n = await page.locator("[data-journey-event]").count(); i < n; i++) {
      await scrollToItemProbe(page, "[data-journey-event]", i);
      const state = await probeState(page, "[data-journey-event]", "journeyYear");
      const current = (await page.locator("[data-journey-current]").textContent())?.trim() || null;
      if (state.active !== state.expected || current !== state.expected) fail(scope, "Journey state mismatch", { index: i, current, ...state });
    }

    if (vp.width <= 1180) {
      await page.evaluate(() => scrollTo(0, 0)); await settle(page, 100);
      const toggle = page.locator(".site-nav__menu-toggle");
      if (!(await toggle.isVisible())) fail(scope, "Menu toggle hidden");
      else {
        const box = await toggle.boundingBox();
        if (!box || box.width < 43.5 || box.height < 43.5) fail(scope, "Menu touch target below 44px", box);
        await toggle.click(); await settle(page, 100);
        const open = await page.evaluate(() => ({
          expanded: document.querySelector(".site-nav__menu-toggle")?.getAttribute("aria-expanded"),
          hidden: document.querySelector(".mobile-menu")?.hidden,
          bodyOpen: document.body.classList.contains("menu-open"),
          mainInert: document.querySelector("#main-content")?.inert || false,
          ariaHidden: document.querySelector("#main-content")?.getAttribute("aria-hidden") || null,
          focusInside: document.querySelector(".mobile-menu")?.contains(document.activeElement) || false
        }));
        if (open.expanded !== "true" || open.hidden || !open.bodyOpen || !open.mainInert || open.ariaHidden !== "true" || !open.focusInside) fail(scope, "Menu open/focus state failed", open);
        await page.keyboard.press("Escape"); await settle(page, 90);
        const closed = await page.evaluate(() => ({
          expanded: document.querySelector(".site-nav__menu-toggle")?.getAttribute("aria-expanded"),
          hidden: document.querySelector(".mobile-menu")?.hidden,
          bodyOpen: document.body.classList.contains("menu-open"),
          focus: document.activeElement === document.querySelector(".site-nav__menu-toggle")
        }));
        if (closed.expanded !== "false" || !closed.hidden || closed.bodyOpen || !closed.focus) fail(scope, "Menu close/focus state failed", closed);
      }
    }

    await page.setViewportSize({ width: 844, height: 390 }); await settle(page, 130);
    await page.setViewportSize({ width: 1024, height: 768 }); await settle(page, 130);
    await page.setViewportSize({ width: vp.width, height: vp.height }); await settle(page, 130);
    if (await page.evaluate(() => document.body.classList.contains("menu-open"))) fail(scope, "Resize left menu open");

    const sticky = await page.evaluate(() => [...document.querySelectorAll("body *")].filter(el => {
      const s = getComputedStyle(el), r = el.getBoundingClientRect();
      return s.position === "sticky" && s.display !== "none" && s.visibility !== "hidden" && r.width > 1 && r.height > 1;
    }).map(el => { const r = el.getBoundingClientRect(); return { className: typeof el.className === "string" ? el.className : "", left:r.left,right:r.right,width:r.width,height:r.height }; }));
    for (const item of sticky) if (item.left < -2 || item.right > vp.width + 2) fail(scope, "Visible sticky geometry invalid", item);

    await page.evaluate(() => scrollTo(0,0)); await settle(page,80);
    await page.screenshot({ path: path.join(OUT, `${locale}-${vp.name}-top.png`), fullPage: false });
    results.push({ scope, stickyCount: sticky.length });
    flush();
  } catch (error) {
    fail(scope, "Interaction QA exception", String(error?.stack || error)); flush();
  } finally { await context.close(); }
}

async function runText(browser, locale, width) {
  const scope = `${locale}/text-${width}`;
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  const flush = diagnostics(page, scope);
  try {
    await page.goto(`${ORIGIN}/${locale}/`, { waitUntil: "networkidle", timeout: 30000 });
    await page.evaluate(() => document.fonts?.ready);
    await page.addStyleTag({ content: "[data-reveal]{opacity:1!important;transform:none!important}.portrait-frame,.workflow-step,.journey-event{opacity:1!important;transform:none!important}" });
    await settle(page, 60);

    const audit = await page.evaluate(({ HEADINGS, PROSE }) => {
      const vw = document.documentElement.clientWidth;
      const visible = el => { const s=getComputedStyle(el),r=el.getBoundingClientRect(); return s.display!=="none"&&s.visibility!=="hidden"&&r.width>0&&r.height>0; };
      function flow(el) {
        const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT); const tokens=[]; const split=[]; let node;
        while((node=walker.nextNode())) for(const match of (node.textContent||"").matchAll(/\S+/gu)) {
          const range=document.createRange(); range.setStart(node,match.index); range.setEnd(node,match.index+match[0].length);
          const rects=[...range.getClientRects()].filter(r=>r.width>.5&&r.height>.5); if(!rects.length) continue;
          const tops=[]; for(const r of rects) if(!tops.some(t=>Math.abs(t-r.top)<1.5)) tops.push(r.top);
          if(tops.length>1) split.push(match[0]);
          for(const r of rects) tokens.push({ token:match[0], top:r.top,left:r.left,right:r.right,outside:r.left < -1 || r.right > vw + 1 });
        }
        tokens.sort((a,b)=>a.top-b.top||a.left-b.left); const lines=[];
        for(const t of tokens){let line=lines.find(x=>Math.abs(x.top-t.top)<2);if(!line){line={top:t.top,tokens:[],left:t.left,right:t.right};lines.push(line);}line.tokens.push(t.token);line.left=Math.min(line.left,t.left);line.right=Math.max(line.right,t.right);}
        return { lines:lines.sort((a,b)=>a.top-b.top).map(x=>({tokens:x.tokens,width:x.right-x.left})), splitTokens:split, outside:tokens.filter(x=>x.outside).map(x=>x.token) };
      }
      const scan=selectors=>selectors.flatMap(selector=>[...document.querySelectorAll(selector)].filter(visible).map((el,index)=>{const r=el.getBoundingClientRect();return{selector,index,text:(el.textContent||"").trim().replace(/\s+/g," "),clientWidth:el.clientWidth,scrollWidth:el.scrollWidth,rect:{left:r.left,right:r.right},...flow(el)};}));
      return { viewportWidth:vw, documentScrollWidth:document.documentElement.scrollWidth, headings:scan(HEADINGS), prose:scan(PROSE) };
    }, { HEADINGS, PROSE });

    if(audit.documentScrollWidth > audit.viewportWidth + 1) {
      const horizontalShift = await page.evaluate(() => {
        const startX = scrollX;
        const startY = scrollY;
        scrollTo(document.documentElement.scrollWidth, startY);
        const shiftedX = scrollX;
        scrollTo(startX, startY);
        return shiftedX;
      });
      if(Math.abs(horizontalShift) > 1) {
        fail(scope,"Scrollable horizontal overflow",{viewportWidth:audit.viewportWidth,documentScrollWidth:audit.documentScrollWidth,horizontalShift});
      }
    }
    /* WebKit is the strict macOS/Safari typography gate. Ubuntu Firefox uses different
       system-ui metrics, so Firefox remains a runtime + real document-overflow gate. */
    if(NAME !== "firefox") {
      for(const item of audit.headings){
        const hard=item.splitTokens.filter(v=>!v.includes("-")&&!v.includes("/"));
        if(item.scrollWidth>item.clientWidth+2||item.rect.left<-1||item.rect.right>audit.viewportWidth+1||item.outside.length||hard.length) fail(scope,"Heading flow break",{...item,splitTokens:hard,ratio:item.clientWidth?item.scrollWidth/item.clientWidth:null});
        item.lines.forEach((line,lineIndex)=>{const words=line.tokens.map(clean).filter(Boolean);if(words.length===1&&WEAK[locale].has(words[0]))fail(scope,"Isolated weak word",{selector:item.selector,index:item.index,lineIndex,line});if(words.length===1&&words[0].length===1&&!/^\d$/u.test(words[0]))fail(scope,"Isolated single letter",{selector:item.selector,index:item.index,lineIndex,line});});
        if(item.lines.length>=7) fail(scope,"Excessive heading line count",{selector:item.selector,index:item.index,lineCount:item.lines.length,text:item.text});
      }
      for(const item of audit.prose){const hard=item.splitTokens.filter(v=>!v.includes("-")&&!v.includes("/"));if(item.scrollWidth>item.clientWidth+2||item.outside.length||hard.length)fail(scope,"Prose flow break",{...item,splitTokens:hard,ratio:item.clientWidth?item.scrollWidth/item.clientWidth:null});}
    }
    results.push({ scope, headingCount:audit.headings.length, proseCount:audit.prose.length }); flush();
  } catch(error){fail(scope,"Text QA exception",String(error?.stack||error));flush();}
  finally{await context.close();}
}

const browser = await TYPE.launch({ headless:true });
try {
  for(const locale of LOCALES){
    for(const vp of INTERACTION) await runInteraction(browser,locale,vp);
    for(const width of WIDTHS) await runText(browser,locale,width);
  }
} finally { await browser.close(); }

const report={browser:NAME,generatedAt:new Date().toISOString(),failureCount:failures.length,failures,results,locales:LOCALES,interactionViewports:INTERACTION,textWidths:WIDTHS};
fs.writeFileSync(path.join(OUT,"cross-browser-report.json"),JSON.stringify(report,null,2));
fs.writeFileSync(path.join(OUT,"cross-browser-summary.txt"),`Cross-browser QA v2\nBrowser: ${NAME}\nFailures: ${failures.length}\n`);
if(failures.length){console.error(`FAIL: ${NAME} cross-browser QA v2 found ${failures.length} issue(s).`);console.error(JSON.stringify(failures.slice(0,160),null,2));process.exit(1);}
console.log(`PASS: ${NAME} cross-browser QA v2 completed with 0 failures.`);
