# Needs: 04-build-sections/004-05-verify

## Description

Build the site and confirm the Six differentiators section renders + passes section-specific assertions.

## Inputs

- `apps/landing/src/pages/index.astro`
- `apps/landing/src/components/sections/FeatureGrid.astro`

## Expected Outputs

- `apps/landing/.content/sections/feature-grid/PASSED`

## Checks

- **build-succeeds**: pnpm build succeeds with this section integrated
- **rendered-output-exists**: dist/index.html was emitted
- **section-id-rendered**: <section id=feature-grid> is in the rendered HTML
- **passed-marker**: PASSED marker file written (signals next section can start)
