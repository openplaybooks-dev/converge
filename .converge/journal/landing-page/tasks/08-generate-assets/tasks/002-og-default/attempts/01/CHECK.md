# Checks: 08-generate-assets/002-og-default

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## og-default-exists
**Description**: og/default.png exists
**Command**: `test -f apps/landing/public/og/default.png`

## og-default-correct-size
**Description**: og/default.png is 1200×630
**Command**: `test -f apps/landing/public/og/default.png && file apps/landing/public/og/default.png | grep -qE '1200 x 630|1200x630'`