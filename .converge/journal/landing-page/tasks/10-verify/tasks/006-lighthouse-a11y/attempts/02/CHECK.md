# Checks: 10-verify/006-lighthouse-a11y

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## lighthouse-a11y-95
**Description**: Lighthouse Accessibility >= 95 on /
**Command**: `pkill -9 -f "astro preview" 2>/dev/null; sleep 1
cd apps/landing && pnpm preview > /tmp/converge-landing-preview.log 2>&1 &
PREVIEW_PID=$!
sleep 6
LH_URL=http://localhost:4321/ node /Users/minh/Documents/converge/.converge/playbooks/landing-page/scripts/lighthouse-gate.mjs accessibility 95
RC=$?
pkill -9 -f "astro preview" 2>/dev/null
exit $RC
`