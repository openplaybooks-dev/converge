# Checks: 01-prepare-spec/001-sitemap

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## sitemap-json-exists
**Description**: sitemap.json exists
**Command**: `test -f apps/landing/.content/sitemap.json`

## sitemap-valid-json
**Description**: sitemap.json is valid JSON
**Command**: `test -f apps/landing/.content/sitemap.json && node -e "JSON.parse(require('fs').readFileSync('apps/landing/.content/sitemap.json','utf8'))"`

## includes-home-and-docs
**Description**: includes / and at least one /docs/ route
**Command**: `test -f apps/landing/.content/sitemap.json && node -e "const r=require('./apps/landing/.content/sitemap.json');const routes=r.routes||r;const set=new Set(routes.map(x=>x.path||x));process.exit(set.has('/') && [...set].some(p=>p.startsWith('/docs/')) ? 0 : 1)"`

## includes-blog
**Description**: includes /blog route
**Command**: `test -f apps/landing/.content/sitemap.json && node -e "const r=require('./apps/landing/.content/sitemap.json');const routes=r.routes||r;process.exit(routes.some(x=>(x.path||x)==='/blog') ? 0 : 1)"`