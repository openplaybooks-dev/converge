# Checks: 04-build-sections/005-05-verify

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## build-succeeds
**Description**: pnpm build succeeds with this section integrated
**Command**: `test -f apps/landing/package.json && pnpm --filter @converge/landing build`

## rendered-output-exists
**Description**: dist/index.html was emitted
**Command**: `test -f apps/landing/dist/index.html`

## section-id-rendered
**Description**: <section id=comparison> is in the rendered HTML
**Command**: `test -f apps/landing/dist/index.html && grep -qE 'id="comparison"' apps/landing/dist/index.html`

## passed-marker
**Description**: PASSED marker file written (signals next section can start)
**Command**: `test -f apps/landing/.content/sections/comparison/PASSED`