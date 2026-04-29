# Task Journal: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-02c-background/scene-forest-tutorial-02c-background-02b-bg-mid/scene-forest-tutorial-02c-background-02b-bg-mid-seg-04

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
  test -s assets/scenes/forest-tutorial/bg-mid/segments/seg-003.png
  python -c "
from PIL import Image
import numpy as np
a = np.array(Image.open('assets/scenes/forest-tutorial/bg-mid/segments/seg-003.png').convert('RGB'))
r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
h = a.shape[0]
# Green-screen contract: chroma green stays as RGB content end-to-end
# (no alpha keying). Top half should be mostly chroma (far shows
# through after composition); bottom half should be solid mid content.
chroma = (r < 60) & (g > 180) & (b < 60)
content = ~chroma
top_chroma  = chroma[:h // 2].mean()
bot_content = content[h // 2:].mean()
assert top_chroma > 0.40, f'top half of bg-mid segment only {top_chroma:.1%} chroma green — should be mostly chroma so far shows through'
assert bot_content > 0.70, f'bottom half of bg-mid segment only {bot_content:.1%} painted content — should be solid mid-distance painting, no chroma gaps'
# Horizon between chroma and content must be irregular (not flat).
row_solid = (chroma.all(axis=1) | content.all(axis=1)).sum()
assert row_solid / h <= 0.85, f'{row_solid}/{h} rows are entirely chroma or entirely content — horizon should be irregular across multiple rows'
"

```