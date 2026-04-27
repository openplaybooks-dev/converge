# Checks: 10-verify/005-lighthouse-perf

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## lighthouse-perf-95
**Description**: Lighthouse Performance >= 95 on /
**Command**: `cd apps/landing && pnpm preview > /tmp/converge-landing-preview.log 2>&1 &
PREVIEW_PID=$!
sleep 5
LH_URL=http://localhost:4321/ node .converge/playbooks/landing-page/scripts/lighthouse-gate.mjs performance 95
RC=$?
kill $PREVIEW_PID 2>/dev/null
wait $PREVIEW_PID 2>/dev/null
exit $RC
`