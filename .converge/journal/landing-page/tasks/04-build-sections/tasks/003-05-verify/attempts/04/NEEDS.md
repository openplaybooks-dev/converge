# Needs: 04-build-sections/003-05-verify

## Description

Build the site and confirm the Define how vs. define done section renders + passes section-specific assertions.

## Inputs

- `apps/landing/src/pages/index.astro`
- `apps/landing/src/components/sections/ProblemSolution.astro`

## Expected Outputs

- `apps/landing/.content/sections/problem-solution/PASSED`

## Checks

- **build-succeeds**: pnpm build succeeds with this section integrated
- **rendered-output-exists**: dist/index.html was emitted
- **section-id-rendered**: <section id=problem-solution> is in the rendered HTML
- **passed-marker**: PASSED marker file written (signals next section can start)
