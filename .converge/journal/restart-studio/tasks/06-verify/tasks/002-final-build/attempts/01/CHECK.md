# Checks: 06-verify/002-final-build

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## build-succeeded
**Description**: Build report shows exit 0
**Command**: `test -f .converge/studio-state/final-build.json && node -e "const r=JSON.parse(require('fs').readFileSync('.converge/studio-state/final-build.json','utf8'));process.exit(r.exitCode===0?0:1)"`