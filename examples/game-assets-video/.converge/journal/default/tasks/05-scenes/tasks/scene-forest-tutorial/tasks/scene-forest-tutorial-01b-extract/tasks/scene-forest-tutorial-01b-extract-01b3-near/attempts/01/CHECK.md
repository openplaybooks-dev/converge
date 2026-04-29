# Checks: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-01b-extract/scene-forest-tutorial-01b-extract-01b3-near

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## bg-near-extracted-exists
**Description**: bg-near extraction PNG was written
**Command**: `test -s assets/scenes/forest-tutorial/extracted/bg-near.png`

## bg-near-extracted-irregular-alpha
**Description**: bg-near has per-pixel irregular alpha and majority transparent area (foreground only in bottom strip)
**Command**: `python -c "
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
`

## bg-near-extracted-no-band-marker
**Description**: prompt sidecar is a real model pass
**Command**: `python -c "
t = open('assets/scenes/forest-tutorial/extracted/bg-near.prompt.txt').read().lower()
bad = [m for m in ('band-extraction', 'band extraction', 'fallback', 'local fallback', 'rows ') if m in t]
assert not bad, f'near prompt sidecar contains fallback markers: {bad}'
"
`