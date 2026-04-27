# Needs: 04-build-sections/006-05-verify

## Description

Build the site and confirm the From zero to converged in 60s section renders + passes section-specific assertions.

## Inputs

- `apps/landing/src/pages/index.astro`
- `apps/landing/src/components/sections/Quickstart.astro`

## Expected Outputs

- `apps/landing/.content/sections/quickstart/PASSED`

## Checks

- **build-succeeds**: pnpm build succeeds with this section integrated
- **rendered-output-exists**: dist/index.html was emitted
- **section-id-rendered**: <section id=quickstart> is in the rendered HTML
- **passed-marker**: PASSED marker file written (signals next section can start)
