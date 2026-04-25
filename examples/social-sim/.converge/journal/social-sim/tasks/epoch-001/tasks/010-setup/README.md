# Task Journal: epoch-001/010-setup

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
  test -f runs/run-2026-04-25T01-45/personas.json
  python3 -c "import json,sys; d=json.load(open('runs/run-2026-04-25T01-45/personas.json')); sys.exit(0 if isinstance(d,list) and len(d)==10 else 1)"

  test -f runs/run-2026-04-25T01-45/graph.json
  python3 -c "import json,sys; d=json.load(open('runs/run-2026-04-25T01-45/graph.json')); sys.exit(0 if 'follows' in d and isinstance(d['follows'],dict) else 1)"

  touch runs/run-2026-04-25T01-45/timeline.jsonl && test -f runs/run-2026-04-25T01-45/timeline.jsonl
  test -f vault/runs/run-2026-04-25T01-45/overview.md
  test "$(ls vault/runs/run-2026-04-25T01-45/personas/*.md 2>/dev/null | wc -l | tr -d ' ')" = "10"

```