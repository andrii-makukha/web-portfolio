import fs from 'node:fs';

// Changes to this legal gate intentionally trigger Browser, Cross-Browser and Lighthouse release QA.
const requiredFiles = [
  '404.html',
  'sitemap.xml',
  'robots.txt',
  'de/impressum/index.html',
  'de/datenschutz/index.html',
  'en/legal-notice/index.html',
  'en/privacy/index.html',
  'ru/impressum/index.html',
  'ru/privacy/index.html',
];

const failures = [];
const legalAddressParts = ['Am Hackenzaun 8', '83233 Bernau am Chiemsee'];
const privacyFiles = [
  'de/datenschutz/index.html',
  'en/privacy/index.html',
  'ru/privacy/index.html',
];
const portfolioPages = {
  'de/index.html': ['../de/impressum/', '../de/datenschutz/'],
  'en/index.html': ['../en/legal-notice/', '../en/privacy/'],
  'ru/index.html': ['../ru/impressum/', '../ru/privacy/'],
};
const vercelPrivacyUrl = 'https://vercel.com/legal/privacy-notice';
const vercelProviderParts = [
  'Vercel Inc.',
  '440 N Barranca Avenue #4133',
  'Covina, CA 91723',
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) failures.push(`missing required file: ${file}`);
}

if (failures.length === 0) {
  const robots = fs.readFileSync('robots.txt', 'utf8');
  const sitemap = fs.readFileSync('sitemap.xml', 'utf8');
  const errorPage = fs.readFileSync('404.html', 'utf8');
  const portfolioJs = fs.readFileSync('js/portfolio.js', 'utf8');

  if (!robots.includes('Sitemap:')) failures.push('robots.txt does not expose a sitemap');
  if (!sitemap.includes('/de/') || !sitemap.includes('/en/') || !sitemap.includes('/ru/')) {
    failures.push('sitemap.xml does not include all DE/EN/RU portfolio URLs');
  }
  if (!sitemap.includes('hreflang="x-default"')) failures.push('sitemap.xml is missing x-default hreflang');
  if (!errorPage.includes('noindex,follow')) failures.push('404 page must be noindex,follow');

  const legalPages = requiredFiles.filter((file) => /impressum|datenschutz|legal-notice|privacy/.test(file));
  for (const file of legalPages) {
    const html = fs.readFileSync(file, 'utf8');
    if (!html.includes('noindex,follow')) failures.push(`${file}: legal page must be noindex,follow`);
    if (html.includes('__LEGAL_ADDRESS_REQUIRED__')) failures.push(`${file}: serviceable postal address is still missing`);
    for (const addressPart of legalAddressParts) {
      if (!html.includes(addressPart)) failures.push(`${file}: legal address is incomplete (${addressPart})`);
    }
  }

  for (const file of privacyFiles) {
    const html = fs.readFileSync(file, 'utf8');
    if (!html.includes('Vercel')) failures.push(`${file}: Vercel hosting disclosure is missing`);
    if (!html.includes(vercelPrivacyUrl)) failures.push(`${file}: Vercel Privacy Notice link is missing`);
    if (html.includes('GitHub Pages')) failures.push(`${file}: stale GitHub Pages hosting disclosure remains`);
    for (const providerPart of vercelProviderParts) {
      if (!html.includes(providerPart)) failures.push(`${file}: Vercel provider identification is incomplete (${providerPart})`);
    }
    if (/retention|Speicherdauer|Срок хранения/i.test(html) && /technical data[^<]*GitHub|technischer Daten bei GitHub|технических данных GitHub/i.test(html)) {
      failures.push(`${file}: stale GitHub retention disclosure remains`);
    }
  }

  for (const [file, routes] of Object.entries(portfolioPages)) {
    const html = fs.readFileSync(file, 'utf8');
    const legalGroupCount = (html.match(/class="contact__legal"/g) || []).length;
    if (legalGroupCount !== 1) failures.push(`${file}: expected exactly one static contact__legal group, found ${legalGroupCount}`);

    for (const route of routes) {
      const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const routeCount = (html.match(new RegExp(`href="${escaped}"`, 'g')) || []).length;
      if (routeCount !== 1) failures.push(`${file}: expected exactly one footer legal link to ${route}, found ${routeCount}`);
    }
  }

  if (/injectLegalLinks|data-legal-links|legalByLocale/.test(portfolioJs)) {
    failures.push('js/portfolio.js: runtime legal-link injection must not exist; legal links are static HTML');
  }
}

if (failures.length) {
  console.error('\n=== Legal / 404 / Search readiness QA ===');
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}

console.log('PASS: legal pages, Vercel hosting disclosures, serviceable address, single static localized legal footer, custom 404 and search-indexing prerequisites are complete.');
