# Checks: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-02c-background/scene-forest-tutorial-02c-background-02b-bg-mid/scene-forest-tutorial-02c-background-02b-bg-mid-seg-02

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## bg-mid-seg-png-exists
**Description**: bg-mid segment PNG written
**Command**: `test -s assets/scenes/forest-tutorial/bg-mid/segments/seg-001.png`

## bg-mid-seg-stacking-shape
**Description**: segment follows green-screen stacking contract — top half mostly chroma green (far shows through after composition), bottom half solid mid content (near covers it later), horizon irregular
**Command**: `python -c "
from PIL import Image
import numpy as np
a = np.array(Image.open('assets/scenes/forest-tutorial/bg-mid/segments/seg-001.png').convert('RGB'))
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
`