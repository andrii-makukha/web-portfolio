import fs from 'node:fs';

const BASE = 'https://web-portfolio-woad-two.vercel.app';
const LEGACY_BASE = 'https://andrii-makukha.github.io/web-portfolio';
const failures = [];

const locales = {
  de: {
    file: 'de/index.html',
    legalLinks: ['../de/impressum/', '../de/datenschutz/'],
  },
  en: {
    file: 'en/index.html',
    legalLinks: ['../en/legal-notice/', '../en/privacy/'],
  },
  ru: {
    file: 'ru/index.html',
    legalLinks: ['../ru/impressum/', '../ru/privacy/'],
  },
};

const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

for (const [locale, config] of Object.entries(locales)) {
  const html = fs.readFileSync(config.file, 'utf8');
  const pageUrl = `${BASE}/${locale}/`;

  expect(!html.includes(LEGACY_BASE), `${config.file}: legacy GitHub Pages URL remains`);
  expect(html.includes(`<link rel="canonical" href="${pageUrl}">`), `${config.file}: canonical is not ${pageUrl}`);
  expect(html.includes(`<meta property="og:url" content="${pageUrl}">`), `${config.file}: og:url is not ${pageUrl}`);
  expect(html.includes(`<meta property="og:image" content="${BASE}/assets/og-portfolio.png">`), `${config.file}: og:image is not on Vercel production`);
  expect(html.includes(`<meta name="twitter:image" content="${BASE}/assets/og-portfolio.png">`), `${config.file}: twitter:image is not on Vercel production`);
  expect(html.includes(`"url":"${pageUrl}"`), `${config.file}: JSON-LD Person URL is not on Vercel production`);

  for (const targetLocale of ['de', 'en', 'ru']) {
    expect(
      html.includes(`hreflang="${targetLocale}" href="${BASE}/${targetLocale}/"`),
      `${config.file}: hreflang ${targetLocale} is not on Vercel production`,
    );
  }
  expect(
    html.includes(`hreflang="x-default" href="${BASE}/de/"`),
    `${config.file}: x-default hreflang is not the German Vercel URL`,
  );

  for (const legalLink of config.legalLinks) {
    expect(html.includes(`href="${legalLink}"`), `${config.file}: missing legal footer link ${legalLink}`);
  }
}

const sitemap = fs.readFileSync('sitemap.xml', 'utf8');
expect(!sitemap.includes(LEGACY_BASE), 'sitemap.xml: legacy GitHub Pages URL remains');
for (const locale of ['de', 'en', 'ru']) {
  expect(sitemap.includes(`<loc>${BASE}/${locale}/</loc>`), `sitemap.xml: missing ${locale.toUpperCase()} Vercel URL`);
}
expect(sitemap.includes(`hreflang="x-default" href="${BASE}/de/"`), 'sitemap.xml: x-default does not target German Vercel URL');

const robots = fs.readFileSync('robots.txt', 'utf8');
expect(!robots.includes(LEGACY_BASE), 'robots.txt: legacy GitHub Pages URL remains');
expect(robots.includes(`Sitemap: ${BASE}/sitemap.xml`), 'robots.txt: sitemap does not point to Vercel production');

const notFound = fs.readFileSync('404.html', 'utf8');
expect(!notFound.includes(LEGACY_BASE), '404.html: legacy GitHub Pages URL remains');
expect(notFound.includes('noindex,follow'), '404.html: noindex,follow is missing');
for (const locale of ['de', 'en', 'ru']) {
  expect(notFound.includes(`href="${BASE}/${locale}/"`), `404.html: ${locale.toUpperCase()} fallback does not target Vercel production`);
}

const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
expect(vercel?.git?.deploymentEnabled === true, 'vercel.json: Git deployments are not enabled');

if (failures.length) {
  console.error('\n=== Vercel production metadata QA ===');
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}

console.log('PASS: Vercel production metadata, localized legal links and search endpoints are aligned.');
