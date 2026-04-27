# FEEDBACK.md — Check Results

**Status**: ❌ 1/1 check(s) failed

- ❌ **dev-server-curl-tagline**

## ❌ dev-server-curl-tagline

**Command**: `cd apps/landing && pnpm dev > /tmp/converge-landing-dev.log 2>&1 &
DEV_PID=$!
sleep 8
RES=$(curl -s -o /tmp/converge-landing-curl.html -w "%{http_code}" http://localhost:4321/ || echo "fail")
kill $DEV_PID 2>/dev/null
wait $DEV_PID 2>/dev/null
test "$RES" = "200" && grep -q "Define done. Converge gets there." /tmp/converge-landing-curl.html
`
**Exit code**: 1
**Output**:
```
Command failed: cd apps/landing && pnpm dev > /tmp/converge-landing-dev.log 2>&1 &
DEV_PID=$!
sleep 8
RES=$(curl -s -o /tmp/converge-landing-curl.html -w "%{http_code}" http://localhost:4321/ || echo "fail")
kill $DEV_PID 2>/dev/null
wait $DEV_PID 2>/dev/null
test "$RES" = "200" && grep -q "Define done. Converge gets there." /tmp/converge-landing-curl.html
```
