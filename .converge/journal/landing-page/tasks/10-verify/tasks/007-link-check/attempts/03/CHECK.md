# Checks: 10-verify/007-link-check

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## link-check
**Description**: internal link checker passes (skips external URLs — those are placeholders)
**Command**: `(cd apps/landing && test -d dist && (pnpm add -D @lychee-org/lychee linkinator 2>&1 && pnpm exec lychee --offline dist 2>&1 || pnpm exec linkinator dist --recurse --silent --skip 'https?://' 2>&1))`