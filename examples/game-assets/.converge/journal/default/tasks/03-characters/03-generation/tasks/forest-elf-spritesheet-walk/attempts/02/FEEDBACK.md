# FEEDBACK.md — Check Results

**Status**: ❌ 1/1 check(s) failed

- ❌ **spritesheet-png-is-4x4-grid**

## ❌ spritesheet-png-is-4x4-grid

**Command**: `python -c "from PIL import Image; im=Image.open('assets/characters/forest-elf/spritesheets/walk/walk.png'); w,h=im.size; assert w==h, f'not square: {im.size}'; assert w>=256 and w%4==0, f'expected 4x4 grid (square, side>=256, divisible by 4): {im.size}'"
`
**Exit code**: 1
**Output**:
```
Traceback (most recent call last):
  File "<string>", line 1, in <module>
  File "/opt/homebrew/Caskroom/miniconda/base/lib/python3.12/site-packages/PIL/Image.py", line 3513, in open
    fp = builtins.open(filename, "rb")
         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
FileNotFoundError: [Errno 2] No such file or directory: 'assets/characters/forest-elf/spritesheets/walk/walk.png'
```
