# Checks: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-01b-extract/scene-forest-tutorial-01b-extract-01b2-mid

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## bg-mid-extracted-exists
**Description**: bg-mid extraction PNG was written
**Command**: `test -s assets/scenes/forest-tutorial/extracted/bg-mid.png`

## bg-mid-extracted-shape
**Description**: bg-mid follows green-screen stacking — top half mostly chroma green (far shows through after composition), bottom half solid painted content, horizon irregular
**Command**: `python -c "
from PIL import Image
import numpy as np
a = np.array(Image.open('assets/scenes/forest-tutorial/extracted/bg-mid.png').convert('RGB'))
r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
h = a.shape[0]
# Green-screen contract: chroma green stays as RGB end-to-end.
# Top half mostly chroma (#00FF00 — far shows through after composition);
# bottom half is solid mid-distance painting.
chroma = (r < 60) & (g > 180) & (b < 60)
content = ~chroma
top_chroma = chroma[:h // 2].mean()
bot_content = content[h // 2:].mean()
assert top_chroma > 0.40, f'top half of bg-mid only {top_chroma:.1%} chroma green — should be mostly chroma so far shows through (prompt told the model to fill top half with #00FF00)'
assert bot_content > 0.70, f'bottom half of bg-mid only {bot_content:.1%} painted content — should be solid mid-distance painting, no chroma gaps'
# The horizon between chroma and content must be irregular.
row_solid = (chroma.all(axis=1) | content.all(axis=1)).sum()
assert row_solid / h <= 0.85, f'{row_solid}/{h} rows are entirely chroma or entirely content — the horizon should be an irregular silhouette across multiple rows'
"
`

## bg-mid-extracted-no-band-marker
**Description**: prompt sidecar is a real model pass (not a hand-rolled band slice)
**Command**: `python -c "
t = open('assets/scenes/forest-tutorial/extracted/bg-mid.prompt.txt').read().lower()
bad = [m for m in ('FALLBACK PATH', 'BAND-EXTRACTION FALLBACK', 'local-fallback writer') if m in t.upper() or m.lower() in t]
assert not bad, f'mid prompt sidecar contains fallback markers: {bad}'
"
`