# FEEDBACK.md — Check Results

**Status**: ❌ 4/4 check(s) failed

- ❌ **bg-far-extracted-exists**
- ❌ **bg-far-extracted-fully-opaque**
- ❌ **bg-far-extracted-no-chroma-green**
- ❌ **bg-far-extracted-no-band-marker**

## ❌ bg-far-extracted-exists

**Command**: `test -s assets/scenes/forest-tutorial/extracted/bg-far.png`
**Exit code**: 1

## ❌ bg-far-extracted-fully-opaque

**Command**: `python -c "
from PIL import Image
import numpy as np
a = np.array(Image.open('assets/scenes/forest-tutorial/extracted/bg-far.png').convert('RGBA'))[:, :, 3]
not_opaque = int((a < 255).sum())
assert not_opaque == 0, f'bg-far must be fully opaque (alpha=255 for every pixel); {not_opaque} pixels are not — far is the back wall, no transparency, no chroma-key allowed'
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
FileNotFoundError: [Errno 2] No such file or directory: 'assets/scenes/forest-tutorial/extracted/bg-far.png'
```

## ❌ bg-far-extracted-no-chroma-green

**Command**: `python -c "
from PIL import Image
import numpy as np
rgb = np.array(Image.open('assets/scenes/forest-tutorial/extracted/bg-far.png').convert('RGB'))
r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
pure_green = ((r < 30) & (g > 220) & (b < 30)).sum()
assert pure_green == 0, f'bg-far has {pure_green} pure-green pixels — far must contain no chroma-key markers'
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
FileNotFoundError: [Errno 2] No such file or directory: 'assets/scenes/forest-tutorial/extracted/bg-far.png'
```

## ❌ bg-far-extracted-no-band-marker

**Command**: `python -c "
t = open('assets/scenes/forest-tutorial/extracted/bg-far.prompt.txt').read().lower()
bad = [m for m in ('band-extraction', 'band extraction', 'fallback', 'local fallback', 'rows ') if m in t]
assert not bad, f'far prompt sidecar contains fallback markers: {bad}'
"
`
**Exit code**: 1
**Output**:
```
Traceback (most recent call last):
  File "<string>", line 2, in <module>
FileNotFoundError: [Errno 2] No such file or directory: 'assets/scenes/forest-tutorial/extracted/bg-far.prompt.txt'
```
