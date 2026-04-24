# Task Journal: 01-prepare-requirements/006-enrich-screens-html-reference

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
  python3 -c "import json; json.load(open('.stitch/screens.json'))"
  python3 -c "import json,sys; d=json.load(open('.stitch/screens.json')); sys.exit(0 if isinstance(d,list) and all(isinstance(x,dict) and 'htmlReference' in x and isinstance(x.get('htmlReference'),str) for x in d) else 1)"
```