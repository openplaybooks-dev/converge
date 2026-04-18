# Checks: 06-quality/002-build-verify

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## build-report-exists
**Description**: Build report exists
**Command**: `test -f .converge/standardize-state/quality/build-report.json`

## build-passes
**Description**: All packages build successfully
**Command**: `node -e "const r=JSON.parse(require('fs').readFileSync('.converge/standardize-state/quality/build-report.json','utf-8'));if(!r.success)throw new Error(r.failedPackages.join(', ')+' failed to build')"`