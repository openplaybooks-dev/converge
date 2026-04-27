# Checks: 06-wiring/001-package-and-next-config

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## next-config-exists
**Description**: next.config.mjs exists
**Command**: `test -f packages/converge-studio/next.config.mjs`

## transpile-packages
**Description**: next.config.mjs transpiles workspace packages
**Command**: `grep -q '@converge/core' packages/converge-studio/next.config.mjs && grep -q 'transpilePackages' packages/converge-studio/next.config.mjs`

## dev-script-runs
**Description**: studio typechecks (proxy for build readiness)
**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`