# Checks: 06-verify/003-dev-smoke

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## smoke-passes
**Description**: Smoke shows root redirects and /playbooks 200
**Command**: `test -f .converge/studio-state/dev-smoke.json && node -e "const r=JSON.parse(require('fs').readFileSync('.converge/studio-state/dev-smoke.json','utf8'));process.exit(r.playbooksIndexHas200===true&&r.rootFollowedHttpCode===200?0:1)"`