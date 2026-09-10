# CV v3 — Professional resume design contract

Status: visual baseline approved / production-ready candidate
Branch: `cv-v3-professional-redesign`

## Goal

Create a one-page professional CV that feels related to the Portfolio v2 identity without behaving like a miniature website. The document must be calm, credible, readable in 15–30 seconds and suitable for German application workflows.

## Visual direction

- A4, one page.
- Warm near-white paper background.
- Graphite/ink typography.
- Deep navy used sparingly for hierarchy.
- One muted brass accent for section numbers and hairlines.
- No gradients, glass effects, large colour blocks, progress bars, decorative icons or visual gimmicks.
- The selected professional studio portrait is placed in the upper-right as the only large image.
- Portrait stays rectangular with a restrained radius and a subtle border; no circular avatar treatment.
- Strong name typography and generous whitespace.
- Section language borrows the portfolio's editorial numbering, but in a much quieter application-document form.

## Information architecture

Header:
- Andrii Makukha
- professional positioning line
- Bernau am Chiemsee, Germany
- phone, email, GitHub and portfolio
- portrait

Main reading order:
1. Profile
2. Professional experience
3. Selected projects
4. Education & training
5. Capabilities
6. Languages

The PDF drawing order follows the same sequence to keep extracted text logical for ATS parsing.

## Content rules

- Do not invent experience, employers, metrics, certificates or technologies.
- Keep ReSchuhe explicitly marked as in development.
- Present Portfolio v2 as a human-directed project with AI-assisted research/implementation/QA, not as professional software-engineering employment.
- Music, leadership and organisation remain the professional foundation.
- Hillel Fullstack JavaScript remains training/education rather than employment experience.
- German is the master language.
- English and Russian use the same approved visual system and equivalent factual structure.
- Locale differences may change line wrapping, but must not change the visual hierarchy or professional weight of the document.

## Technical quality gate

Every candidate must:
- remain exactly one A4 page in DE / EN / RU;
- keep text selectable/searchable;
- keep phone/email/GitHub/portfolio clickable;
- render the portrait without distortion;
- have no clipping, overlaps or broken glyphs;
- pass `pdfinfo` page-count checks;
- pass `pdftotext` content and replacement-character checks;
- reproduce the committed ATS text exactly when rebuilt from source;
- reproduce the committed 200-dpi visual render exactly when rebuilt from source;
- be reviewed visually in all three locales before release.

## Release rule

The visual baseline is locked. Future work before release is limited to factual/text corrections or measured QA fixes. Do not redesign the composition without an explicit reason.

The production-named PDFs are prepared in the branch, but `main` is not changed until explicit release approval.
