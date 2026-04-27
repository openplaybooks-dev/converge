# Needs: 04-build-sections/008-05-verify

## Description

Build the site and confirm the Get started section renders + passes section-specific assertions.

## Inputs

- `apps/landing/src/pages/index.astro`
- `apps/landing/src/components/sections/CtaBanner.astro`

## Expected Outputs

- `apps/landing/.content/sections/cta-banner/PASSED`

## Checks

- **build-succeeds**: pnpm build succeeds with this section integrated
- **rendered-output-exists**: dist/client/index.html was emitted
- **section-id-rendered**: <section id=cta> is in the rendered HTML
- **passed-marker**: PASSED marker file written (signals next section can start)
