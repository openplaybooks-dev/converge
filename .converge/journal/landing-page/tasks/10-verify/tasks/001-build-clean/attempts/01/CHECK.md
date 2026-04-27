# Checks: 10-verify/001-build-clean

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## build-succeeds
**Description**: pnpm build exits 0
**Command**: `test -d apps/landing/src && pnpm --filter @converge/landing build`

## dist-emitted
**Description**: dist/ contains index.html
**Command**: `test -d apps/landing/dist && test -f apps/landing/dist/index.html`

## no-build-warnings
**Description**: build emits no warnings
**Command**: `test -d apps/landing/src && pnpm --filter @converge/landing build 2>&1 | (! grep -iE '(warning|warn:)\s')`