# Checks: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-02c-background/scene-forest-tutorial-02c-background-02a-bg-far

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## bg-far-png-exists
**Description**: bg-far.png exists
**Command**: `test -s assets/scenes/forest-tutorial/bg-far.png`

## bg-far-atlas-exists
**Description**: bg-far.atlas.json exists
**Command**: `test -s assets/scenes/forest-tutorial/bg-far.atlas.json`

## bg-far-is-fully-opaque
**Description**: bg-far is the back wall — must be fully opaque
**Command**: `python -c "
from PIL import Image
import numpy as np
a = np.array(Image.open('assets/scenes/forest-tutorial/bg-far.png').convert('RGBA'))
alpha = a[:, :, 3]
total = alpha.size
opaque = (alpha == 255).sum()
ratio = opaque / total
assert ratio > 0.95, f'bg-far must be fully opaque (>95% alpha=255); got {ratio:.2%} — looks like a chroma-keyed slice, not a real backdrop'
"
`