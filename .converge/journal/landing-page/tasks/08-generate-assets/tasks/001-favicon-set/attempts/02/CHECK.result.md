# RESULT.md — Attempt 2

**Outcome**: ❌ FAILED
**Duration**: 59ms
**Completed**: 2026-04-26T20:09:47.844Z

## Outputs

- `apps/landing/public/favicon.svg` — ✓ produced (233 B)
- `apps/landing/public/apple-touch-icon.png` — ✗ missing
- `apps/landing/public/site.webmanifest` — ✗ missing

## Check Results — ❌ some failed

- ✓ **favicon-svg-exists**: favicon.svg exists
- ✗ **apple-touch-icon-exists**: apple-touch-icon.png exists
- ✗ **webmanifest-exists**: site.webmanifest exists and is valid JSON
- ✗ **webmanifest-has-name**: webmanifest name is Converge

## Failed Check Details

### apple-touch-icon-exists — ❌ FAILED
**Command**: `test -f apps/landing/public/apple-touch-icon.png`
**Exit code**: 1
**Output**: *(none)*

### webmanifest-exists — ❌ FAILED
**Command**: `test -f apps/landing/public/site.webmanifest && node -e "JSON.parse(require('fs').readFileSync('apps/landing/public/site.webmanifest','utf8'))"`
**Exit code**: 1
**Output**: *(none)*

### webmanifest-has-name — ❌ FAILED
**Command**: `test -f apps/landing/public/site.webmanifest && node -e "const m=require('./apps/landing/public/site.webmanifest');process.exit(m.name==='Converge'?0:1)"`
**Exit code**: 1
**Output**: *(none)*
