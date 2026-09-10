# Andrii Makukha — Interactive Professional Profile

A multilingual personal portfolio built as an **interactive professional profile**, not as a conventional developer portfolio or a web version of a CV.

The site presents a professional foundation in music, leadership and organisation, then shows how that experience is extended through modern digital tools and AI-assisted workflows.

## Concept

**CRAFT → AUGMENTED**

The narrative moves from professional craft and responsibility to modern tools:

- music, precision and live performance
- leadership and team coordination
- organisation, customers and budgets
- continuous learning
- AI-assisted research, structuring, creation and review
- selected work and digital explorations

The central idea is simple: **technology does not replace experience or judgement; it expands what can be learned, structured and delivered.**

## Languages

The portfolio has three independent language versions:

- German — `/de/`
- English — `/en/`
- Russian — `/ru/`

German is the default version. Language switching preserves the current chapter/hash.

## Technology

The implementation is intentionally lightweight:

- semantic HTML
- modern CSS
- small, dependency-free JavaScript
- static hosting
- progressive enhancement
- no frontend framework required for the public experience

The production pages load no third-party runtime resources.

## Motion & accessibility

Motion is used as part of the narrative rather than as decoration:

- reveal transitions
- chapter/theme changes
- AI workflow progression
- active Journey states
- opening scroll transformation
- page progress

The site also includes:

- `prefers-reduced-motion` support
- no-JavaScript content fallback
- keyboard focus states and focus trapping
- responsive navigation and mobile touch targets
- semantic headings and landmarks
- axe-core WCAG A/AA release checks

## CV

The repository contains locale-specific one-page CV PDFs:

- German — `assets/cv/andrii-makukha-de.pdf`
- English — `assets/cv/andrii-makukha-en.pdf`
- Russian — `assets/cv/andrii-makukha-ru.pdf`

The CVs are generated from `scripts/build_cv.py`. The CV workflow rebuilds them in CI, verifies one-page output, compares ATS text and rendered PNGs against the committed PDFs, and uploads QA artifacts. It does not modify the repository.

## Browser QA

The repository includes an automated Playwright/Chromium release gate covering:

- DE / EN / RU production pages
- 1440 × 900 desktop
- 1280 × 800 laptop
- 1024 × 900 tablet
- 844 × 390 landscape
- 360 × 800 mobile
- horizontal overflow and editorial headline containment
- internal anchors and IDs
- image loading, failed requests and console/page errors
- responsive menu behaviour, focus handling and focus trapping
- touch targets and keyboard interaction
- language switching with hash preservation
- chapter state and navigation theme in both scroll directions
- aggressive bidirectional scrolling
- AI workflow and Journey state synchronisation
- resize/orientation stress
- reduced-motion and no-JavaScript fallbacks
- cumulative layout shift and lightweight performance budgets
- unexpected external runtime requests
- axe-core WCAG A/AA checks
- curated external project-link health
- social-preview metadata
- locale-specific CV download integration and PDF validation

Screenshots, JSON reports and CV visual/text QA outputs are stored as GitHub Actions artifacts.

## Release & hosting

GitHub Pages is the intended public host. Automatic Vercel Git deployments are disabled in `vercel.json` to avoid an unused parallel deployment path.

Both permanent quality workflows support the release branch and `main`. Changes that affect the public release surface are expected to pass the browser QA gate before release. CV source changes rebuild and verify the locale-specific PDF files reproducibly.

## AI transparency

AI is used as a working tool for research, exploration, implementation assistance, iteration and quality review. Direction, factual decisions, evaluation and final responsibility remain human-led.

The portfolio does not present AI-assisted implementation as professional software-development experience.

© 2026 Andrii Makukha
