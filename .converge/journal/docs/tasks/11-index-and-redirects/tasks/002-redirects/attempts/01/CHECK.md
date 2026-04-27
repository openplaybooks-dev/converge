# Checks: 11-index-and-redirects/002-redirects

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## redirects-exists
**Description**: redirects manifest exists and is valid JSON
**Command**: `test -f docs/_redirects.json && node -e "JSON.parse(require('fs').readFileSync('docs/_redirects.json','utf8'))"`

## redirects-array
**Description**: has a redirects array (possibly empty)
**Command**: `node -e "const r=require('./docs/_redirects.json');process.exit(Array.isArray(r.redirects)?0:1)"`