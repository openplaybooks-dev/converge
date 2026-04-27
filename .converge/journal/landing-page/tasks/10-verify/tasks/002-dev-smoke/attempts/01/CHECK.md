# Checks: 10-verify/002-dev-smoke

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## dev-server-curl-tagline
**Description**: dev server starts in <10s, GET / is 200, body contains the tagline
**Command**: `cd apps/landing && pnpm dev > /tmp/converge-landing-dev.log 2>&1 &
DEV_PID=$!
sleep 8
RES=$(curl -s -o /tmp/converge-landing-curl.html -w "%{http_code}" http://localhost:4321/ || echo "fail")
kill $DEV_PID 2>/dev/null
wait $DEV_PID 2>/dev/null
test "$RES" = "200" && grep -q "Define done. Converge gets there." /tmp/converge-landing-curl.html
`