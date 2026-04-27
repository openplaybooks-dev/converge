# RESULT.md — Attempt 1

**Outcome**: ❌ FAILED
**Duration**: 6m 20s
**Completed**: 2026-04-26T23:56:38.295Z

## Check Results — ❌ some failed

- ✗ **lighthouse-a11y-95**: Lighthouse Accessibility >= 95 on /

## Failed Check Details

### lighthouse-a11y-95 — ❌ FAILED
**Command**: `pkill -9 -f "astro preview" 2>/dev/null; sleep 1
cd apps/landing && pnpm preview > /tmp/converge-landing-preview.log 2>&1 &
PREVIEW_PID=$!
sleep 6
LH_URL=http://localhost:4321/ node /Users/minh/Documents/converge/.converge/playbooks/landing-page/scripts/lighthouse-gate.mjs accessibility 95
RC=$?
pkill -9 -f "astro preview" 2>/dev/null
exit $RC
`
**Exit code**: 1
**Output**:
```
OK accessibility=95 (>=95)
```
