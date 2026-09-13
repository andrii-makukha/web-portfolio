import fs from 'node:fs';

const files = {
  de: 'de/index.html',
  en: 'en/index.html',
  ru: 'ru/index.html',
};

const pages = Object.fromEntries(
  Object.entries(files).map(([locale, file]) => [locale, fs.readFileSync(file, 'utf8')])
);

const failures = [];
const canonicalHost = 'web-portfolio-woad-two.vercel.app';
const retiredHost = 'andrii-makukha.github.io/web-portfolio';

const requiredShared = [
  'Hardy Orchestra',
  'Symbioz Band',
  'ReSchuhe',
  'Hillel IT School',
  '80+',
  '2017–2022',
  '09/2019–02/2022',
  '2024–2025',
  'https://aurum-clean.vercel.app/de/site',
  'https://github.com/andrii-makukha/Aurum',
  'https://github.com/andrii-makukha/automobilanwendung',
];

for (const [locale, html] of Object.entries(pages)) {
  for (const anchor of requiredShared) {
    if (!html.includes(anchor)) failures.push(`${locale}: missing factual/content anchor: ${anchor}`);
  }
  if (!html.includes('>B2<')) failures.push(`${locale}: German B2 level is missing`);
  if (!html.includes(canonicalHost)) failures.push(`${locale}: canonical Vercel host is missing`);
  if (html.includes(retiredHost)) failures.push(`${locale}: retired GitHub Pages host remains`);
}

const requiredLocaleCopy = {
  de: [
    '<span>Rollen</span>',
    '<span>ändern sich.</span>',
    '<span>Arbeitsweise</span>',
    '<span>bleibt.</span>',
    'Gründer einer achtköpfigen Band',
    'IN ENTWICKLUNG / 2026',
    'Erfahrung bleibt.',
    'Werkzeuge verändern sich.',
  ],
  en: [
    '<span>Roles</span>',
    '<span>change.</span>',
    '<span>The way I work</span>',
    '<span>remains.</span>',
    'founder of an eight-person band',
    'IN DEVELOPMENT / 2026',
  ],
  ru: [
    '<span>Роли</span>',
    '<span>меняются.</span>',
    '<span>Подход</span>',
    '<span>остаётся.</span>',
    'основателем коллектива из восьми музыкантов',
    'В РАЗРАБОТКЕ / 2026',
    'Опыт остаётся.',
    'Инструменты меняются.',
    '>Правовая информация<',
    '>Конфиденциальность<',
  ],
};

for (const [locale, anchors] of Object.entries(requiredLocaleCopy)) {
  for (const anchor of anchors) {
    if (!pages[locale].includes(anchor)) failures.push(`${locale}: missing approved copy anchor: ${anchor}`);
  }
}

const unsupportedSpecificity = [
  /Brass Band/i,
  /brass band/i,
  /брасс[-‑–— ]?бэнд/i,
];
for (const [locale, html] of Object.entries(pages)) {
  for (const pattern of unsupportedSpecificity) {
    if (pattern.test(html)) failures.push(`${locale}: unsupported Symbioz genre specificity remains (${pattern})`);
  }
}

const cvSource = fs.readFileSync('scripts/build_cv_v3.py', 'utf8');
if (!cvSource.includes(`"portfolio": "${canonicalHost}/"`)) {
  failures.push('CV source: canonical Vercel portfolio URL is missing');
}
if (cvSource.includes(retiredHost)) failures.push('CV source: retired GitHub Pages URL remains');

if (failures.length) {
  console.error('\n=== Multilingual content parity QA ===');
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}

console.log('PASS: DE/EN/RU factual anchors, approved positioning copy, project links and CV/site production-host parity are consistent.');
