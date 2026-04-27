# FEEDBACK.md — Check Results

**Status**: ❌ 3/3 check(s) failed

- ❌ **source-png-is-real**
- ❌ **canonical-png-is-real**
- ❌ **manifest-has-canonical-angle**

## ❌ source-png-is-real

**Command**: `python -c "from PIL import Image; im=Image.open('assets/characters/forest-elf/ref/source/source.png'); assert min(im.size)>=256, f'source too small: {im.size}'"
`
**Exit code**: 1
**Output**:
```
Traceback (most recent call last):
  File "<string>", line 1, in <module>
  File "/opt/homebrew/Caskroom/miniconda/base/lib/python3.12/site-packages/PIL/Image.py", line 3513, in open
    fp = builtins.open(filename, "rb")
         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
FileNotFoundError: [Errno 2] No such file or directory: 'assets/characters/forest-elf/ref/source/source.png'
```

## ❌ canonical-png-is-real

**Command**: `python -c "from PIL import Image; im=Image.open('assets/characters/forest-elf/ref/canonical/canonical.png'); assert min(im.size)>=64, f'canonical too small: {im.size}'"
`
**Exit code**: 1
**Output**:
```
Traceback (most recent call last):
  File "<string>", line 1, in <module>
  File "/opt/homebrew/Caskroom/miniconda/base/lib/python3.12/site-packages/PIL/Image.py", line 3513, in open
    fp = builtins.open(filename, "rb")
         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
FileNotFoundError: [Errno 2] No such file or directory: 'assets/characters/forest-elf/ref/canonical/canonical.png'
```

## ❌ manifest-has-canonical-angle

**Command**: `python -c "import json; m=json.load(open('assets/characters/forest-elf/ref/manifest.json')); assert 'canonical_angle' in m and 'rotation_y' in m, f'manifest missing keys: {m}'"
`
**Exit code**: 1
**Output**:
```
Traceback (most recent call last):
  File "<string>", line 1, in <module>
FileNotFoundError: [Errno 2] No such file or directory: 'assets/characters/forest-elf/ref/manifest.json'
```
