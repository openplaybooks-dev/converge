# Checks: 09-polish/001-hero-animation

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## animation-component-exists
**Description**: ConvergenceJourney.astro exists
**Command**: `test -f apps/landing/src/components/animations/ConvergenceJourney.astro`

## animation-respects-reduced-motion
**Description**: respects prefers-reduced-motion
**Command**: `test -f apps/landing/src/components/animations/ConvergenceJourney.astro && grep -qE 'prefers-reduced-motion|prefersReducedMotion' apps/landing/src/components/animations/ConvergenceJourney.astro`

## animation-uses-css-only
**Description**: animation is CSS-only (no JS) — keeps Lighthouse perf up
**Command**: `test -f apps/landing/src/components/animations/ConvergenceJourney.astro && ! grep -qE 'addEventListener|requestAnimationFrame|setInterval' apps/landing/src/components/animations/ConvergenceJourney.astro`