# Needs: 09-polish/002-scroll-reveals

## Inputs

- `apps/landing/src/components/layout/Section.astro`

## Expected Outputs

- `apps/landing/src/components/layout/Section.astro`
- `apps/landing/src/styles/animations.css`

## Checks

- **animations-css-exists**: animations.css exists
- **section-uses-reveal-class**: Section component supports the reveal class
- **respects-reduced-motion**: animations.css respects prefers-reduced-motion
