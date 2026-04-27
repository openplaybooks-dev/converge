# Checks: 06-wiring/003-e2e-verify

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## report-written
**Description**: E2E verification report file exists with the expected schema (human review required for actual scenario verdicts)
**Command**: `test -f .converge/studio-state/e2e-verify.json && node -e "const r=JSON.parse(require('fs').readFileSync('.converge/studio-state/e2e-verify.json','utf8'));process.exit(Array.isArray(r.scenarios)&&r.scenarios.length>0?0:1)"`