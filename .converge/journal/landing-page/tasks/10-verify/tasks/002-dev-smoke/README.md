# Task Journal: 10-verify/002-dev-smoke

## Current attempt — `attempts/01/`

| File | Purpose |
|------|---------|
| `NEEDS.md` | Needs spec (inputs, outputs, checks defined) |
| `NEEDS.result.md` | Input evaluation (files found, blocked/ready) |
| `TASK.md` | Task instructions for the AI |
| `CHECK.md` | Check spec (ids, commands) |
| `CHECK.result.md` | Check outcomes after execution (pass/fail, output state) |
| `LEARN.md` | Failure analysis from previous attempt (attempt 2+) |
| `data/needs.json` | Machine-readable needs (inputs, outputs, blocked state) |
| `data/check.json` | Machine-readable check definitions |
| `data/facts.json` | Facts collected during execution |

## How to run / resume

```bash
pnpm converge run --step   # run next pending task
pnpm converge run          # run all remaining tasks
```

## Verify checks manually

```bash
  cd apps/landing && pnpm dev > /tmp/converge-landing-dev.log 2>&1 &
DEV_PID=$!
sleep 8
RES=$(curl -s -o /tmp/converge-landing-curl.html -w "%{http_code}" http://localhost:4321/ || echo "fail")
kill $DEV_PID 2>/dev/null
wait $DEV_PID 2>/dev/null
test "$RES" = "200" && grep -q "Define done. Converge gets there." /tmp/converge-landing-curl.html

```