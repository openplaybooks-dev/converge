# Task Journal: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-02c-background/scene-forest-tutorial-02c-background-02c-bg-near/scene-forest-tutorial-02c-background-02c-bg-near-seg-04

## Current attempt — `attempts/02/`

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
  test -s assets/scenes/forest-tutorial/bg-near/seg-003.png
  python -c "
from PIL import Image
import numpy as np
a = np.array(Image.open('assets/scenes/forest-tutorial/bg-near/seg-003.png').convert('RGBA'))
alpha = a[:, :, 3]
h, _ = alpha.shape
total = alpha.size
total_opaque = (alpha == 255).sum()
ratio = total_opaque / total
assert 0.10 < ratio < 0.65, f'bg-near segment opacity {ratio:.2%} outside [10%, 65%]'
bot_opaque = (alpha[h//2:] == 255).sum()
bottom_share = bot_opaque / max(total_opaque, 1)
assert bottom_share > 0.65, f'segment content should concentrate in the bottom half; got {bottom_share:.2%}'
top30_opaque = (alpha[:int(h*0.30)] == 255).mean()
assert top30_opaque < 0.15, f'top 30% should be mostly transparent; got {top30_opaque:.2%} opaque'
"

```