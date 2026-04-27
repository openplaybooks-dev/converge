# Checks: 04-ui/023-runtime-smoke

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## smoke-report-exists
**Description**: Smoke report file exists and reports root-redirect-200 = true
**Command**: `test -f .converge/studio-state/runtime-smoke.json && node -e "const r=JSON.parse(require('fs').readFileSync('.converge/studio-state/runtime-smoke.json','utf8'));process.exit(r.rootRedirectsToPlaybooks===true&&r.playbooksIndexHas200===true?0:1)"`