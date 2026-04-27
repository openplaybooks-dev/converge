# Checks: 04-ui/020-converge-shell

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## layout-exists
**Description**: Slim layout.tsx exists
**Command**: `test -f packages/converge-studio/src/app/layout.tsx`

## header-exists
**Description**: Converge header component exists
**Command**: `test -f packages/converge-studio/src/components/layout/converge-header.tsx`

## header-imported-by-layout
**Description**: layout.tsx imports the converge header
**Command**: `grep -q 'converge-header' packages/converge-studio/src/app/layout.tsx`

## layout-has-no-mc-imports
**Description**: layout.tsx imports no Mission Control component
**Command**: `bash -c 'L=packages/converge-studio/src/app/layout.tsx; ! grep -qE "nav-rail|site-header|live-feed|local-mode-banner|launch|onboarding|fleet|gateway|openclaw" $L'`

## typecheck-passes
**Description**: Studio typechecks
**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`