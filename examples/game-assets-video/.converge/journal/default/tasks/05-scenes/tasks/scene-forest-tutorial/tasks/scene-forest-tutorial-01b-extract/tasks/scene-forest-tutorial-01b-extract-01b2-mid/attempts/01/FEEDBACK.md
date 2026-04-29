# FEEDBACK.md — Check Results

**Status**: ❌ 3/3 check(s) failed

- ❌ **bg-mid-extracted-exists**
- ❌ **bg-mid-extracted-irregular-alpha**
- ❌ **bg-mid-extracted-no-band-marker**

## ❌ bg-mid-extracted-exists

**Command**: `test -s assets/scenes/forest-tutorial/extracted/bg-mid.png`
**Exit code**: 1

## ❌ bg-mid-extracted-irregular-alpha

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
**Exit code**: 1
**Output**:
```
Traceback (most recent call last):
  File "<string>", line 4, in <module>
  File "/opt/homebrew/Caskroom/miniconda/base/lib/python3.12/site-packages/PIL/Image.py", line 3513, in open
    fp = builtins.open(filename, "rb")
         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
FileNotFoundError: [Errno 2] No such file or directory: 'assets/scenes/forest-tutorial/extracted/bg-mid.png'
```

## ❌ bg-mid-extracted-no-band-marker

**Command**: `python -c "
t = open('assets/scenes/forest-tutorial/extracted/bg-mid.prompt.txt').read().lower()
bad = [m for m in ('band-extraction', 'band extraction', 'fallback', 'local fallback', 'rows ') if m in t]
assert not bad, f'mid prompt sidecar contains fallback markers: {bad}'
"
`
**Exit code**: 1
**Output**:
```
Traceback (most recent call last):
  File "<string>", line 2, in <module>
FileNotFoundError: [Errno 2] No such file or directory: 'assets/scenes/forest-tutorial/extracted/bg-mid.prompt.txt'
```
