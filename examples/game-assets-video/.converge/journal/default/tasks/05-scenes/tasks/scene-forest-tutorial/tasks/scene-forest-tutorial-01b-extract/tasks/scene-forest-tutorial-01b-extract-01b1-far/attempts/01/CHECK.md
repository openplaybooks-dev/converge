# Checks: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-01b-extract/scene-forest-tutorial-01b-extract-01b1-far

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## bg-far-extracted-exists
**Description**: bg-far extraction PNG was written
**Command**: `test -s assets/scenes/forest-tutorial/extracted/bg-far.png`

## bg-far-extracted-fully-opaque
**Description**: bg-far is the back wall — every pixel must be alpha=255 (no transparency at all)
**Command**: `python -c "
from PIL import Image
import numpy as np
a = np.array(Image.open('assets/scenes/forest-tutorial/extracted/bg-far.png').convert('RGBA'))[:, :, 3]
not_opaque = int((a < 255).sum())
assert not_opaque == 0, f'bg-far must be fully opaque (alpha=255 for every pixel); {not_opaque} pixels are not — far is the back wall, no transparency, no chroma-key allowed'
"
`

## bg-far-extracted-no-chroma-green
**Description**: bg-far has zero pure-green pixels (no chroma-key markers leaked through)
**Command**: `python -c "
from PIL import Image
import numpy as np
rgb = np.array(Image.open('assets/scenes/forest-tutorial/extracted/bg-far.png').convert('RGB'))
r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
pure_green = ((r < 30) & (g > 220) & (b < 30)).sum()
assert pure_green == 0, f'bg-far has {pure_green} pure-green pixels — far must contain no chroma-key markers'
"
`

## bg-far-extracted-no-band-marker
**Description**: prompt sidecar is a real model pass (not a hand-rolled band slice)
**Command**: `python -c "
t = open('assets/scenes/forest-tutorial/extracted/bg-far.prompt.txt').read().lower()
bad = [m for m in ('band-extraction', 'band extraction', 'local fallback', 'fallback writer') if m in t]
assert not bad, f'far prompt sidecar contains fallback markers: {bad}'
"
`