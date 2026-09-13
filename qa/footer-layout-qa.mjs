import fs from 'node:fs';
import { chromium, firefox, webkit } from 'playwright';

const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:4173';
const browserName = process.env.QA_BROWSER || 'chromium';
const browserTypes = { chromium, firefox, webkit };
const browserType = browserTypes[browserName];

if (!browserType) {
  throw new Error(`Unsupported QA_BROWSER: ${browserName}`);
}

const outputDir = `qa-output/footer-layout/${browserName}`;
const locales = ['de', 'en', 'ru'];
const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'mobile', width: 390, height: 844 },
];

fs.mkdirSync(outputDir, { recursive: true });

const failures = [];
const browser = await browserType.launch({ headless: true });

const overlaps = (a, b) => {
  const tolerance = 1;
  return !(
    a.right <= b.left + tolerance ||
    b.right <= a.left + tolerance ||
    a.bottom <= b.top + tolerance ||
    b.bottom <= a.top + tolerance
  );
};

try {
  for (const locale of locales) {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport });
      const label = `${browserName}/${locale}/${viewport.name}`;

      try {
        await page.goto(`${origin}/${locale}/`, { waitUntil: 'networkidle' });
        const footer = page.locator('.contact__footer');
        await footer.scrollIntoViewIfNeeded();
        await page.waitForTimeout(80);

        const snapshot = await footer.evaluate((element) => {
          const directChildren = [...element.children];
          const box = (node) => {
            const rect = node.getBoundingClientRect();
            return {
              left: rect.left,
              right: rect.right,
              top: rect.top,
              bottom: rect.bottom,
              width: rect.width,
              height: rect.height,
            };
          };

          const anchors = [...element.querySelectorAll('a')].map((anchor) => ({
            text: anchor.textContent.trim(),
            ...box(anchor),
          }));

          return {
            footer: box(element),
            children: directChildren.map((child) => ({
              tag: child.tagName,
              className: child.className,
              text: child.textContent.replace(/\s+/g, ' ').trim(),
              ...box(child),
            })),
            anchors,
            gridTemplateAreas: getComputedStyle(element).gridTemplateAreas,
            documentScrollWidth: document.documentElement.scrollWidth,
            viewportWidth: window.innerWidth,
            legalLinks: element.querySelectorAll('.contact__legal a').length,
          };
        });

        if (snapshot.children.length !== 4) {
          failures.push(`${label}: expected 4 direct footer items, found ${snapshot.children.length}`);
        }
        if (snapshot.legalLinks !== 2) {
          failures.push(`${label}: expected 2 legal links, found ${snapshot.legalLinks}`);
        }
        if (snapshot.documentScrollWidth > snapshot.viewportWidth + 1) {
          failures.push(`${label}: horizontal page overflow ${snapshot.documentScrollWidth}px > ${snapshot.viewportWidth}px`);
        }

        for (const anchor of snapshot.anchors) {
          if (anchor.height < 43) {
            failures.push(`${label}: footer link '${anchor.text}' hit area is only ${anchor.height.toFixed(1)}px high`);
          }
        }

        for (let i = 0; i < snapshot.children.length; i += 1) {
          for (let j = i + 1; j < snapshot.children.length; j += 1) {
            if (overlaps(snapshot.children[i], snapshot.children[j])) {
              failures.push(`${label}: footer items overlap: '${snapshot.children[i].text}' / '${snapshot.children[j].text}'`);
            }
          }
        }

        const [copyright, transparency, legal, top] = snapshot.children;
        if (copyright && transparency && Math.abs(copyright.left - transparency.left) > 2) {
          failures.push(`${label}: service-information lines are not aligned`);
        }

        if (viewport.width > 900) {
          const expectedAreas = '"copyright legal top" "transparency legal top"';
          if (snapshot.gridTemplateAreas !== expectedAreas) {
            failures.push(`${label}: unexpected desktop grid areas: ${snapshot.gridTemplateAreas}`);
          }
          if (legal && top && legal.right > top.left + 1) {
            failures.push(`${label}: legal area collides with back-to-top area`);
          }
        } else if (viewport.width <= 560) {
          const expectedAreas = '"copyright top" "transparency transparency" "legal legal"';
          if (snapshot.gridTemplateAreas !== expectedAreas) {
            failures.push(`${label}: unexpected mobile grid areas: ${snapshot.gridTemplateAreas}`);
          }
          if (transparency && copyright && transparency.top < copyright.bottom - 1) {
            failures.push(`${label}: transparency row is not placed below copyright`);
          }
          if (legal && transparency && legal.top < transparency.bottom - 1) {
            failures.push(`${label}: legal row is not placed below transparency`);
          }
        } else {
          const expectedAreas = '"copyright top" "transparency top" "legal legal"';
          if (snapshot.gridTemplateAreas !== expectedAreas) {
            failures.push(`${label}: unexpected tablet grid areas: ${snapshot.gridTemplateAreas}`);
          }
          if (legal && transparency && legal.top < transparency.bottom - 1) {
            failures.push(`${label}: legal row is not placed below service information`);
          }
        }

        if (top && Math.abs(top.right - snapshot.footer.right) > 2) {
          failures.push(`${label}: back-to-top is not right-aligned`);
        }

        await footer.screenshot({ path: `${outputDir}/${locale}-${viewport.name}.png` });
      } catch (error) {
        failures.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error('\n=== Footer layout QA ===');
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}

console.log(`PASS: footer information hierarchy, spacing, touch targets and responsive layout are stable across DE/EN/RU in ${browserName}.`);
