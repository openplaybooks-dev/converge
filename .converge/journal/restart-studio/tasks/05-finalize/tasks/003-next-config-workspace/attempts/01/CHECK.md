# Checks: 05-finalize/003-next-config-workspace

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## next-config-exists
**Description**: next.config.mjs exists
**Command**: `test -f packages/studio/next.config.mjs`

## transpile-packages
**Description**: next.config.mjs declares transpilePackages with @converge/core
**Command**: `grep -q 'transpilePackages' packages/studio/next.config.mjs && grep -q '@converge/core' packages/studio/next.config.mjs`