# Needs: 04-build-sections/005-05-verify

## Description

Build the site and confirm the Converge vs. step-driven section renders + passes section-specific assertions.

## Inputs

- `apps/landing/src/pages/index.astro`
- `apps/landing/src/components/sections/InteractiveComparison.astro`

## Expected Outputs

- `apps/landing/.content/sections/comparison/PASSED`

## Checks

- **build-succeeds**: pnpm build succeeds with this section integrated
- **rendered-output-exists**: dist/client/index.html was emitted
- **section-id-rendered**: <section id=comparison> is in the rendered HTML
- **passed-marker**: PASSED marker file written (signals next section can start)
