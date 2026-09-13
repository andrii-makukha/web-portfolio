import fs from 'node:fs';

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

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) failures.push(`missing required file: ${file}`);
}

if (failures.length === 0) {
  const robots = fs.readFileSync('robots.txt', 'utf8');
  const sitemap = fs.readFileSync('sitemap.xml', 'utf8');
  const errorPage = fs.readFileSync('404.html', 'utf8');

  if (!robots.includes('Sitemap:')) failures.push('robots.txt does not expose a sitemap');
  if (!sitemap.includes('/de/') || !sitemap.includes('/en/') || !sitemap.includes('/ru/')) {
    failures.push('sitemap.xml does not include all DE/EN/RU portfolio URLs');
  }
  if (!errorPage.includes('noindex,follow')) failures.push('404 page must be noindex,follow');

  const legalPages = requiredFiles.filter((file) => /impressum|datenschutz|legal-notice|privacy/.test(file));
  for (const file of legalPages) {
    const html = fs.readFileSync(file, 'utf8');
    if (!html.includes('noindex,follow')) failures.push(`${file}: legal page must be noindex,follow`);
    if (html.includes('__LEGAL_ADDRESS_REQUIRED__')) failures.push(`${file}: serviceable postal address is still missing`);
  }
}

if (failures.length) {
  console.error('\n=== Legal / 404 / Search readiness QA ===');
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}

console.log('PASS: legal pages, custom 404 and search-indexing prerequisites are complete.');
