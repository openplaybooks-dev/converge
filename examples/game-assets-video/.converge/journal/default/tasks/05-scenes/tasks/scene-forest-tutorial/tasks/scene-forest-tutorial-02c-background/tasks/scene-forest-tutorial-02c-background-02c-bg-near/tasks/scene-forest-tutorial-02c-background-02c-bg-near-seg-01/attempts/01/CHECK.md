# Checks: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-02c-background/scene-forest-tutorial-02c-background-02c-bg-near/scene-forest-tutorial-02c-background-02c-bg-near-seg-01

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## bg-near-seg-png-exists
**Description**: bg-near segment PNG written
**Command**: `test -s assets/scenes/forest-tutorial/bg-near/seg-000.png`

## bg-near-seg-content-in-bottom-strip
**Description**: segment has foreground strip in the bottom; top is transparent
**Command**: `python -c "
from PIL import Image
import numpy as np
a = np.array(Image.open('assets/scenes/forest-tutorial/bg-near/seg-000.png').convert('RGBA'))
alpha = a[:, :, 3]
h, _ = alpha.shape
total = alpha.size
total_opaque = (alpha == 255).sum()
ratio = total_opaque / total
assert 0.10 < ratio < 0.65, f'bg-near segment opacity {ratio:.2%} outside [10%, 65%]'
bot_opaque = (alpha[h//2:] == 255).sum()
bottom_share = bot_opaque / max(total_opaque, 1)
assert bottom_share > 0.65, f'segment content should concentrate in the bottom half; got {bottom_share:.2%}'
top30_opaque = (alpha[:int(h*0.30)] == 255).mean()
assert top30_opaque < 0.15, f'top 30% should be mostly transparent; got {top30_opaque:.2%} opaque'
"
`