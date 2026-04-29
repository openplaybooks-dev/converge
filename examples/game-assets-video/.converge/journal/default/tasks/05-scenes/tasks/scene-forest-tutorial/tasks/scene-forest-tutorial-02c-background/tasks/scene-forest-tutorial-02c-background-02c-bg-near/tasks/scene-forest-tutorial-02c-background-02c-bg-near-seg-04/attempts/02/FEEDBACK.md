# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **bg-near-seg-png-exists**
- ❌ **bg-near-seg-content-in-bottom-strip**

## ❌ bg-near-seg-png-exists

**Command**: `test -s assets/scenes/forest-tutorial/bg-near/seg-003.png`
**Exit code**: 1

## ❌ bg-near-seg-content-in-bottom-strip

**Command**: `python -c "
from PIL import Image
import numpy as np
a = np.array(Image.open('assets/scenes/forest-tutorial/bg-near/seg-003.png').convert('RGBA'))
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
**Exit code**: 1
**Output**:
```
Traceback (most recent call last):
  File "<string>", line 4, in <module>
  File "/opt/homebrew/Caskroom/miniconda/base/lib/python3.12/site-packages/PIL/Image.py", line 3513, in open
    fp = builtins.open(filename, "rb")
         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
FileNotFoundError: [Errno 2] No such file or directory: 'assets/scenes/forest-tutorial/bg-near/seg-003.png'
```
