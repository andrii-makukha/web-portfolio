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
- active journey states
- opening scroll transformation
- page progress

The site also includes:

- `prefers-reduced-motion` support
- no-JavaScript content fallback
- keyboard focus states
- responsive navigation
- mobile touch targets
- semantic headings and landmarks

## Browser QA

The repository includes an automated Playwright/Chromium QA workflow.

It currently verifies:

- DE / EN / RU
- 1440 × 900 desktop
- 1280 × 800 laptop
- 1024 × 900 tablet
- 360 × 800 mobile
- horizontal overflow
- internal anchors and IDs
- image loading
- console/page errors
- responsive menu behaviour
- touch targets
- language switching with hash preservation
- chapter state and navigation theme in both scroll directions
- reduced-motion fallback
- cumulative layout shift
- unexpected external runtime requests

Screenshots and a JSON QA report are stored as GitHub Actions artifacts.

## AI transparency

AI is used as a working tool for research, exploration, implementation assistance, iteration and quality review. Direction, factual decisions, evaluation and final responsibility remain human-led.

The portfolio does not present AI-assisted implementation as professional software-development experience.

## Status

Portfolio v2 is in final quality review before release.

© 2026 Andrii Makukha
