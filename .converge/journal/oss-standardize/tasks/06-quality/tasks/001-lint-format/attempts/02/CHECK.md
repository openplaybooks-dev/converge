# Checks: 06-quality/001-lint-format

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## lint-report-exists
**Description**: Lint report exists
**Command**: `test -f .converge/standardize-state/quality/lint-report.json`

## lint-passes
**Description**: No lint errors
**Command**: `node -e "const r=JSON.parse(require('fs').readFileSync('.converge/standardize-state/quality/lint-report.json','utf-8'));if(r.errors>0)throw new Error(r.errors+' lint errors')"`