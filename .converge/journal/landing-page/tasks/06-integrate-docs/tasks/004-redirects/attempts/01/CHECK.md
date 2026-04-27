# Checks: 06-integrate-docs/004-redirects

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## redirects-file-exists
**Description**: public/_redirects exists
**Command**: `test -f apps/landing/public/_redirects`

## docs-root-redirect
**Description**: /docs redirects to a real doc page
**Command**: `test -f apps/landing/public/_redirects && grep -qE '^/docs\s+/docs/getting-started/why-converge' apps/landing/public/_redirects`

## legacy-redirects-merged
**Description**: every entry in docs/_redirects.json appears in public/_redirects
**Command**: `test -f apps/landing/public/_redirects && test -f docs/_redirects.json && node -e "const r=require('./docs/_redirects.json').redirects;const f=require('fs').readFileSync('apps/landing/public/_redirects','utf8');const ok=r.every(x=>f.includes(x.from)||f.includes(x.from.replace(/^\/docs\//,'/')));process.exit(ok?0:1)"`