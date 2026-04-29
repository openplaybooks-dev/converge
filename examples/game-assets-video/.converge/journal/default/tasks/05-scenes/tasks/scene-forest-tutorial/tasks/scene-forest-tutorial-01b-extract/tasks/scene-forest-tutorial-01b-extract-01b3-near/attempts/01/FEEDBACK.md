# FEEDBACK.md — Check Results

**Status**: ❌ 3/3 check(s) failed

- ❌ **bg-near-extracted-exists**
- ❌ **bg-near-extracted-irregular-alpha**
- ❌ **bg-near-extracted-no-band-marker**

## ❌ bg-near-extracted-exists

**Command**: `test -s assets/scenes/forest-tutorial/extracted/bg-near.png`
**Exit code**: 1

## ❌ bg-near-extracted-irregular-alpha

**Command**: `python -c "
from PIL import Image
import numpy as np
a = np.array(Image.open('assets/scenes/forest-tutorial/extracted/bg-near.png').convert('RGBA'))[:, :, 3]
h, _ = a.shape
row_solid = ((a == 0).all(axis=1) | (a == 255).all(axis=1)).sum()
assert row_solid / h <= 0.70, f'{row_solid}/{h} solid rows — looks like a band slice, not a real extraction'
# Near should be majority transparent (foreground only in bottom strip).
transparent = (a == 0).sum() / a.size
assert transparent > 0.30, f'bg-near has only {transparent:.1%} transparent pixels — foreground should occupy <70% of the canvas'
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
FileNotFoundError: [Errno 2] No such file or directory: 'assets/scenes/forest-tutorial/extracted/bg-near.png'
```

## ❌ bg-near-extracted-no-band-marker

**Command**: `python -c "
t = open('assets/scenes/forest-tutorial/extracted/bg-near.prompt.txt').read().lower()
bad = [m for m in ('band-extraction', 'band extraction', 'fallback', 'local fallback', 'rows ') if m in t]
assert not bad, f'near prompt sidecar contains fallback markers: {bad}'
"
`
**Exit code**: 1
**Output**:
```
Traceback (most recent call last):
  File "<string>", line 2, in <module>
FileNotFoundError: [Errno 2] No such file or directory: 'assets/scenes/forest-tutorial/extracted/bg-near.prompt.txt'
```
