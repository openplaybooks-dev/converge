# Checks: 10-cross-validate

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## report-exists
**Description**: validation report exists and is valid JSON
**Command**: `test -f docs/_validation-report.json && node -e "JSON.parse(require('fs').readFileSync('docs/_validation-report.json','utf8'))"`

## zero-stale-claims
**Description**: zero stale claims (every documented behavior verified against source)
**Command**: `node -e "const r=require('./docs/_validation-report.json');process.exit((r.staleClaims||[]).length===0?0:1)"`

## zero-missing-sources
**Description**: zero missing source files
**Command**: `node -e "const r=require('./docs/_validation-report.json');process.exit((r.missingSources||[]).length===0?0:1)"`

## pre-flight-passes
**Description**: mechanical validate-docs.mjs passes
**Command**: `node .converge/playbooks/docs/scripts/validate-docs.mjs`