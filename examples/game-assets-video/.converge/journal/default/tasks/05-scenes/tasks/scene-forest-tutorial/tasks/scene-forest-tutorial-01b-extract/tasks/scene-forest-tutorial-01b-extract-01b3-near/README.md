# Task Journal: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-01b-extract/scene-forest-tutorial-01b-extract-01b3-near

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
  test -s assets/scenes/forest-tutorial/extracted/bg-near.png
  python -c "
from PIL import Image
import numpy as np
a = np.array(Image.open('assets/scenes/forest-tutorial/extracted/bg-near.png').convert('RGBA'))[:, :, 3]
h, _ = a.shape
row_solid = ((a == 0).all(axis=1) | (a == 255).all(axis=1)).sum()
assert row_solid / h <= 0.70, f'{row_solid}/{h} solid rows — looks like a band slice, not a real extraction'
# Near should be majority transparent (foreground only in bottom strip).
transparent = (a == 0).sum() / a.size
assert transparent > 0.30, f'bg-near has only {transparent:.1%} transparent pixels — foreground should occupy <70% of the canvas'
"

  python -c "
t = open('assets/scenes/forest-tutorial/extracted/bg-near.prompt.txt').read().lower()
bad = [m for m in ('band-extraction', 'band extraction', 'fallback', 'local fallback', 'rows ') if m in t]
assert not bad, f'near prompt sidecar contains fallback markers: {bad}'
"

```