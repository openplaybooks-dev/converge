# Checks: 09-polish/004-font-cls

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## typography-uses-font-display
**Description**: font-display is set to swap/optional/fallback
**Command**: `test -f apps/landing/src/styles/typography.css && grep -qE 'font-display\s*:\s*(swap|optional|fallback)' apps/landing/src/styles/typography.css`

## has-fallback-font
**Description**: declares system-font fallbacks
**Command**: `test -f apps/landing/src/styles/typography.css && grep -qE 'system-ui|sans-serif|monospace' apps/landing/src/styles/typography.css`