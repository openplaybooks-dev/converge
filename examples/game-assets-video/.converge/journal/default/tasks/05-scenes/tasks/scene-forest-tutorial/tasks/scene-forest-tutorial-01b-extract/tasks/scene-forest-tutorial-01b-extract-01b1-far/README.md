# Task Journal: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-01b-extract/scene-forest-tutorial-01b-extract-01b1-far

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
  test -s assets/scenes/forest-tutorial/extracted/bg-far.png
  python -c "
from PIL import Image
import numpy as np
a = np.array(Image.open('assets/scenes/forest-tutorial/extracted/bg-far.png').convert('RGBA'))[:, :, 3]
not_opaque = int((a < 255).sum())
assert not_opaque == 0, f'bg-far must be fully opaque (alpha=255 for every pixel); {not_opaque} pixels are not — far is the back wall, no transparency, no chroma-key allowed'
"

  python -c "
from PIL import Image
import numpy as np
rgb = np.array(Image.open('assets/scenes/forest-tutorial/extracted/bg-far.png').convert('RGB'))
r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
pure_green = ((r < 30) & (g > 220) & (b < 30)).sum()
assert pure_green == 0, f'bg-far has {pure_green} pure-green pixels — far must contain no chroma-key markers'
"

  python -c "
t = open('assets/scenes/forest-tutorial/extracted/bg-far.prompt.txt').read().lower()
# Detect the FALLBACK PATH marker only, not legitimate negative instructions
# in the real prompt (which says 'Do NOT produce... rows 0..N...').
bad = [m for m in ('FALLBACK PATH', 'BAND-EXTRACTION FALLBACK', 'local-fallback writer') if m in t.upper() or m.lower() in t]
assert not bad, f'far prompt sidecar contains fallback markers: {bad}'
"

```