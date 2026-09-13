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

  const requiredLegalRoutes = [
    "noticeHref: './impressum/'",
    "privacyHref: './datenschutz/'",
    "noticeHref: './legal-notice/'",
    "privacyHref: './privacy/'",
  ];
  for (const route of requiredLegalRoutes) {
    if (!portfolioJs.includes(route)) failures.push(`portfolio footer legal route missing: ${route}`);
  }
  if (!portfolioJs.includes("footer.querySelector('[data-legal-links]')")) {
    failures.push('portfolio footer legal-link duplicate protection is missing');
  }
}

if (failures.length) {
  console.error('\n=== Legal / 404 / Search readiness QA ===');
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}

console.log('PASS: legal pages, Vercel hosting disclosures, serviceable address, localized legal links, custom 404 and search-indexing prerequisites are complete.');
