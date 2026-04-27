# Checks: 01-prepare-spec/004-seo-spec

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## seo-json-exists
**Description**: seo.json exists
**Command**: `test -f apps/landing/.content/seo.json`

## seo-json-valid
**Description**: seo.json is valid JSON
**Command**: `test -f apps/landing/.content/seo.json && node -e "JSON.parse(require('fs').readFileSync('apps/landing/.content/seo.json','utf8'))"`

## site-fields-present
**Description**: site has title, description, ogImage, canonical, locale
**Command**: `test -f apps/landing/.content/seo.json && node -e "const s=require('./apps/landing/.content/seo.json').site;['title','description','ogImage','canonical','locale'].forEach(k=>{if(!s[k])process.exit(1)});process.exit(0)"`

## home-route-meta
**Description**: pages.home is defined
**Command**: `test -f apps/landing/.content/seo.json && node -e "process.exit(require('./apps/landing/.content/seo.json').pages?.home ? 0 : 1)"`

## docs-route-meta
**Description**: pages.docs is defined
**Command**: `test -f apps/landing/.content/seo.json && node -e "process.exit(require('./apps/landing/.content/seo.json').pages?.docs ? 0 : 1)"`

## blog-route-meta
**Description**: pages.blog is defined
**Command**: `test -f apps/landing/.content/seo.json && node -e "process.exit(require('./apps/landing/.content/seo.json').pages?.blog ? 0 : 1)"`