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
lighthouse-gate: performance: 65 < 95
```
