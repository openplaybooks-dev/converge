# Checks: 08-generate-assets/001-favicon-set

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## favicon-svg-exists
**Description**: favicon.svg exists
**Command**: `test -f apps/landing/public/favicon.svg`

## apple-touch-icon-exists
**Description**: apple-touch-icon.png exists
**Command**: `test -f apps/landing/public/apple-touch-icon.png`

## webmanifest-exists
**Description**: site.webmanifest exists and is valid JSON
**Command**: `test -f apps/landing/public/site.webmanifest && node -e "JSON.parse(require('fs').readFileSync('apps/landing/public/site.webmanifest','utf8'))"`

## webmanifest-has-name
**Description**: webmanifest name is Converge
**Command**: `test -f apps/landing/public/site.webmanifest && node -e "const m=require('./apps/landing/public/site.webmanifest');process.exit(m.name==='Converge'?0:1)"`