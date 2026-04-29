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
a = np.array(Image.open('assets/scenes/forest-tutorial/extracted/bg-near.png').convert('RGB'))
r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
h = a.shape[0]
# Green-screen contract: chroma green stays as RGB end-to-end.
chroma = (r < 60) & (g > 180) & (b < 60)
content = ~chroma
# Reject hand-rolled band slices: rows that are entirely chroma or
# entirely content for >70% of the canvas height.
row_solid = (chroma.all(axis=1) | content.all(axis=1)).sum()
assert row_solid / h <= 0.70, f'{row_solid}/{h} solid rows — looks like a band slice, not a real extraction'
# Near should be majority chroma (foreground only in bottom strip).
chroma_ratio = chroma.mean()
assert chroma_ratio > 0.30, f'bg-near has only {chroma_ratio:.1%} chroma green — foreground should occupy <70% of the canvas'
"

  python -c "
t = open('assets/scenes/forest-tutorial/extracted/bg-near.prompt.txt').read().lower()
bad = [m for m in ('FALLBACK PATH', 'BAND-EXTRACTION FALLBACK', 'local-fallback writer') if m in t.upper() or m.lower() in t]
assert not bad, f'near prompt sidecar contains fallback markers: {bad}'
"

```