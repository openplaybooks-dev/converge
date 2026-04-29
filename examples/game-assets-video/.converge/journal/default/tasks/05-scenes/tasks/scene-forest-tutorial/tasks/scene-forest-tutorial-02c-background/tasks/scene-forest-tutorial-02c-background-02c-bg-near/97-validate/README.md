# Task Journal: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-02c-background/scene-forest-tutorial-02c-background-02c-bg-near/97-validate

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
  test -s assets/scenes/forest-tutorial/bg-near.critique.json
  python -c "
import json
c = json.load(open('assets/scenes/forest-tutorial/bg-near.critique.json'))
segs = c.get('segments') or []
high = [s for s in segs if s.get('decision') == 'fix' and s.get('severity') == 'high']
if high:
    tags = [(s.get('index'), s.get('issues')) for s in high]
    raise AssertionError(f'{len(high)} segment(s) flagged with severity=high: {tags}')
"

```