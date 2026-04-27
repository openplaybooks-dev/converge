# Task Journal: 10-verify/006-lighthouse-a11y

## Current attempt — `attempts/wip/`

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
  pkill -9 -f "astro preview" 2>/dev/null; sleep 1
cd apps/landing && pnpm preview > /tmp/converge-landing-preview.log 2>&1 &
PREVIEW_PID=$!
sleep 6
LH_URL=http://localhost:4321/ node /Users/minh/Documents/converge/.converge/playbooks/landing-page/scripts/lighthouse-gate.mjs accessibility 95
RC=$?
pkill -9 -f "astro preview" 2>/dev/null
exit $RC

```