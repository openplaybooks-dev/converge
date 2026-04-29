# FEEDBACK.md — Check Results

**Status**: ❌ 3/3 check(s) failed

- ❌ **bg-far-png-exists**
- ❌ **bg-far-atlas-exists**
- ❌ **bg-far-is-fully-opaque**

## ❌ bg-far-png-exists

**Command**: `test -s assets/scenes/forest-tutorial/bg-far.png`
**Exit code**: 1

## ❌ bg-far-atlas-exists

**Command**: `test -s assets/scenes/forest-tutorial/bg-far.atlas.json`
**Exit code**: 1

## ❌ bg-far-is-fully-opaque

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
**Exit code**: 1
**Output**:
```
Traceback (most recent call last):
  File "<string>", line 4, in <module>
  File "/opt/homebrew/Caskroom/miniconda/base/lib/python3.12/site-packages/PIL/Image.py", line 3513, in open
    fp = builtins.open(filename, "rb")
         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
FileNotFoundError: [Errno 2] No such file or directory: 'assets/scenes/forest-tutorial/bg-far.png'
```
