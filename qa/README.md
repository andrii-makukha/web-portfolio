# Portfolio v2 Quality Gates

The automated browser QA is a release gate for the multilingual portfolio, not a screenshot-only check.

It currently covers:

- DE / EN / RU production pages
- desktop, laptop, tablet, landscape and mobile viewports
- horizontal overflow and editorial headline containment
- chapter state and navigation theme in both scroll directions
- responsive menu behaviour, focus handling and focus trapping
- language switching with hash preservation
- image loading, console errors, failed requests and external runtime requests
- cumulative layout shift and lightweight performance budgets
- reduced-motion and no-JavaScript fallbacks
- aggressive bidirectional scrolling
- AI workflow and Journey state synchronisation
- resize / orientation stress
- keyboard accessibility
- axe-core WCAG A/AA checks
- release-facing external link checks

A release candidate is not considered ready while any gate reports a failure.
