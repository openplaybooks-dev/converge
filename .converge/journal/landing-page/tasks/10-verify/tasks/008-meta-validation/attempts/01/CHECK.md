# Checks: 10-verify/008-meta-validation

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## meta-validation
**Description**: all required meta tags present in dist/index.html
**Command**: `node .converge/playbooks/landing-page/scripts/check-meta-validation.mjs`

## sitemap-exists
**Description**: sitemap.xml is emitted
**Command**: `test -d apps/landing/dist && (test -f apps/landing/dist/sitemap-index.xml || test -f apps/landing/dist/sitemap.xml)`

## robots-exists
**Description**: robots.txt is emitted
**Command**: `test -f apps/landing/dist/robots.txt`

## og-default-shipped
**Description**: default OG image is in dist
**Command**: `test -d apps/landing/dist && (test -f apps/landing/dist/og.png || test -f apps/landing/dist/og/default.png)`