# Needs: 09-polish/001-hero-animation

## Inputs

- `apps/landing/src/icons/convergence-journey.svg`
- `apps/landing/.content/brand.json`

## Expected Outputs

- `apps/landing/src/components/animations/ConvergenceJourney.astro`

## Checks

- **animation-component-exists**: ConvergenceJourney.astro exists
- **animation-respects-reduced-motion**: respects prefers-reduced-motion
- **animation-uses-css-only**: animation is CSS-only (no JS) — keeps Lighthouse perf up
