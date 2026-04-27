# Checks: 10-verify/003-no-upstream-brand

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## no-upstream-brand
**Description**: zero forked-theme brand strings in src/ or dist/
**Command**: `node .converge/playbooks/landing-page/scripts/check-no-upstream-brand.mjs`