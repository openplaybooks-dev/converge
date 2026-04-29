# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **style-sheet-exists**
- ❌ **style-sheet-has-min-size**

## ❌ style-sheet-exists

**Command**: `test -s assets/concept/style-sheet.png`
**Exit code**: 1

## ❌ style-sheet-has-min-size

**Command**: `python -c "from PIL import Image; im=Image.open('assets/concept/style-sheet.png'); w,h=im.size; assert w>=1024 and h>=512, f'style-sheet too small: {im.size}'"
`
**Exit code**: 1
**Output**:
```
Traceback (most recent call last):
  File "<string>", line 1, in <module>
  File "/opt/homebrew/Caskroom/miniconda/base/lib/python3.12/site-packages/PIL/Image.py", line 3513, in open
    fp = builtins.open(filename, "rb")
         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
FileNotFoundError: [Errno 2] No such file or directory: 'assets/concept/style-sheet.png'
```
