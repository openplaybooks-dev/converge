# Checks: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-01b-extract/scene-forest-tutorial-01b-extract-01b3-near

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## bg-near-extracted-exists
**Description**: bg-near extraction PNG was written
**Command**: `test -s assets/scenes/forest-tutorial/extracted/bg-near.png`

## bg-near-extracted-irregular-shape
**Description**: bg-near is a real model pass (irregular silhouette, not a band slice) and majority chroma green (foreground content only in the bottom strip)
**Command**: `python -c "
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
`

## bg-near-extracted-no-band-marker
**Description**: prompt sidecar is a real model pass
**Command**: `python -c "
t = open('assets/scenes/forest-tutorial/extracted/bg-near.prompt.txt').read().lower()
bad = [m for m in ('FALLBACK PATH', 'BAND-EXTRACTION FALLBACK', 'local-fallback writer') if m in t.upper() or m.lower() in t]
assert not bad, f'near prompt sidecar contains fallback markers: {bad}'
"
`