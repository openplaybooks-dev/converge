# Task Journal: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-02c-background/scene-forest-tutorial-02c-background-02a-bg-far

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
  test -s assets/scenes/forest-tutorial/bg-far/final.png
  test -s assets/scenes/forest-tutorial/bg-far/final.atlas.json
  python -c "
from PIL import Image
import numpy as np
a = np.array(Image.open('assets/scenes/forest-tutorial/bg-far/final.png').convert('RGBA'))
alpha = a[:, :, 3]
total = alpha.size
opaque = (alpha == 255).sum()
ratio = opaque / total
assert ratio > 0.95, f'bg-far must be fully opaque (>95% alpha=255); got {ratio:.2%} — looks like a chroma-keyed slice, not a real backdrop'
"

```