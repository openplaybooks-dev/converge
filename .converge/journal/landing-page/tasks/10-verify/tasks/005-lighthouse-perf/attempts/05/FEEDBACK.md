# FEEDBACK.md — Check Results

**Status**: ❌ 1/1 check(s) failed

- ❌ **lighthouse-perf-95**

## ❌ lighthouse-perf-95

**Command**: `cd apps/landing && pnpm preview > /tmp/converge-landing-preview.log 2>&1 &
PREVIEW_PID=$!
sleep 5
LH_URL=http://localhost:4321/ node .converge/playbooks/landing-page/scripts/lighthouse-gate.mjs performance 95
RC=$?
kill $PREVIEW_PID 2>/dev/null
wait $PREVIEW_PID 2>/dev/null
exit $RC
`
**Exit code**: 1
**Output**:
```
/bin/bash: line 1: 63373 Killed: 9               pnpm preview > /tmp/converge-landing-preview.log 2>&1
Runtime error encountered: Chrome prevented page load with an interstitial. Make sure you are testing the correct URL and that the server is properly responding to all requests.
lighthouse-gate: lighthouse exited with status 1
```
