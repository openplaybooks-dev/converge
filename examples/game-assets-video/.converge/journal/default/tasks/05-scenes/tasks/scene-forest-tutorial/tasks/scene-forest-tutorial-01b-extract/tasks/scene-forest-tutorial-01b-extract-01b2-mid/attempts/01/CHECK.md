# Checks: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-01b-extract/scene-forest-tutorial-01b-extract-01b2-mid

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## bg-mid-extracted-exists
**Description**: bg-mid extraction PNG was written
**Command**: `test -s assets/scenes/forest-tutorial/extracted/bg-mid.png`

## bg-mid-extracted-irregular-alpha
**Description**: bg-mid has per-pixel irregular alpha and meaningful transparent area
**Command**: `python -c "
from PIL import Image
import numpy as np
a = np.array(Image.open('assets/scenes/forest-tutorial/extracted/bg-mid.png').convert('RGBA'))[:, :, 3]
h, _ = a.shape
# Real chroma-keyed extractions have per-pixel irregular alpha; band
# slices have entire rows fully opaque or fully transparent.
row_solid = ((a == 0).all(axis=1) | (a == 255).all(axis=1)).sum()
assert row_solid / h <= 0.70, f'{row_solid}/{h} solid rows — looks like a band slice, not a real extraction'
# Mid should have meaningful transparent area (sky above, foreground below).
transparent = (a == 0).sum() / a.size
assert transparent > 0.10, f'bg-mid has only {transparent:.1%} transparent pixels — silhouette band should leave room for far/near above and below'
"
`

## bg-mid-extracted-no-band-marker
**Description**: prompt sidecar is a real model pass (not a hand-rolled band slice)
**Command**: `python -c "
t = open('assets/scenes/forest-tutorial/extracted/bg-mid.prompt.txt').read().lower()
bad = [m for m in ('band-extraction', 'band extraction', 'fallback', 'local fallback') if m in t]
assert not bad, f'mid prompt sidecar contains fallback markers: {bad}'
"
`