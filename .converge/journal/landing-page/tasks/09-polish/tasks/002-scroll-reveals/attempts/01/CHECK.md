# Checks: 09-polish/002-scroll-reveals

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## animations-css-exists
**Description**: animations.css exists
**Command**: `test -f apps/landing/src/styles/animations.css`

## section-uses-reveal-class
**Description**: Section component supports the reveal class
**Command**: `test -f apps/landing/src/components/layout/Section.astro && grep -qE 'reveal-on-scroll|fade-in-up|data-reveal' apps/landing/src/components/layout/Section.astro`

## respects-reduced-motion
**Description**: animations.css respects prefers-reduced-motion
**Command**: `test -f apps/landing/src/styles/animations.css && grep -qE 'prefers-reduced-motion' apps/landing/src/styles/animations.css`