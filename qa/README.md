# Portfolio v2 Quality Gates

The automated browser QA is a release gate for the multilingual portfolio, not a screenshot-only check.

It currently covers:

- DE / EN / RU production pages
- desktop, laptop, tablet, landscape and mobile viewports, plus MacBook 14 (1512×982), MacBook 16 (1728×1117 and 1728×960), Full HD (1920×1080) and QHD (2560×1440) wide-screen checks
- horizontal overflow, viewport-locked vertical clipping and broad editorial headline containment
- dedicated whole-word editorial typography regression checks at 320 px and 360 px across DE / EN / RU
- chapter state and navigation theme in both scroll directions
- responsive menu behaviour, focus handling and focus trapping
- language switching with hash preservation
- image loading, including a dedicated 1122 × 1402 minimum-resolution gate for the optimized identity portrait, console errors, failed requests and external runtime requests
- cumulative layout shift and lightweight performance budgets
- reduced-motion and no-JavaScript fallbacks
- no-JavaScript Opening visibility, usable language navigation and removal of the non-functional mobile menu toggle
- aggressive bidirectional scrolling
- AI workflow and Journey state synchronisation
- resize / orientation stress
- keyboard accessibility
- axe-core WCAG A/AA checks
- release-facing external link checks
- curated live-project links: a public Live link is kept only after visual release review
- social-preview metadata, `summary_large_image` cards and a 1200 × 630 portfolio preview image
- local SVG favicon availability on all locale pages
- multilingual CV integration: locale-specific DE / EN / RU PDF download links, valid PDF responses and no stale placeholders
- active CV calls-to-action that are not styled as disabled/quiet links
- reproducible one-page ATS-friendly CV generation with visual PNG and extracted-text QA artifacts

Identity portrait baseline: the current production portrait is expected to retain at least 1122 × 1402 source pixels. Lower-resolution replacements must fail the browser QA gate.

Verified portrait source: `assets/portrait.avif` is 40,146 bytes with SHA-256 `3965392de7cc4f0361a3406e1b6ff8c9622e988c65d8460223a1a8b8dcd1379d`.

A release candidate is not considered ready while any gate reports a failure.

Wide-screen fluid sizing rule: `vw`-driven `clamp()` values stop growing after the 1536px viewport layout ceiling (1440px content canvas + 48px gutters per side), so typography cannot continue scaling after the content columns have stopped growing.
