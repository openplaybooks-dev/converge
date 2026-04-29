# Task Journal: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-02c-background/scene-forest-tutorial-02c-background-02b-bg-mid/99-stitch

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
  test -s assets/scenes/forest-tutorial/bg-mid/final.png
  test -s assets/scenes/forest-tutorial/bg-mid/final.atlas.json
  python -c "
from PIL import Image
import json
plan = json.load(open('assets/scenes/forest-tutorial/scene-plan.json'))
layer = next(l for l in plan['bg']['layers'] if l['id'] == 'mid')
target_w = layer['target_size'][0]
w, h = Image.open('assets/scenes/forest-tutorial/bg-mid/final.png').size
assert w == target_w, f'stitched width {w} != target {target_w}'
"

```