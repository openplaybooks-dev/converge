# Task Journal: epoch-003/030-analyze

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
  python3 -c "import json,sys; lines=[json.loads(l) for l in open('runs/run-2026-04-25T01-45/metrics.jsonl') if l.strip()]; hits=[l for l in lines if l.get('tick')==3]; sys.exit(0 if len(hits)==1 else 1)"

  grep -q 'Tick 3' vault/reports/misinfo.md
  test -f vault/runs/run-2026-04-25T01-45/ticks/tick-3.md
  grep -q 'tick-3' vault/runs/run-2026-04-25T01-45/overview.md
```