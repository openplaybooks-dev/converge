# FEEDBACK.md — Check Results

**Status**: ❌ 3/3 check(s) failed

- ❌ **prop-spritesheet-png-exists-and-large**
- ❌ **prop-atlas-json-matches-png**
- ❌ **prop-prompt-saved**

## ❌ prop-spritesheet-png-exists-and-large

**Command**: `python -c "from PIL import Image; im=Image.open('assets/objects/gold-key/spritesheets/idle/idle.png'); w,h=im.size; assert w>=512 and h>=256, f'sheet too small: {im.size}'"
`
**Exit code**: 1
**Output**:
```
Traceback (most recent call last):
  File "<string>", line 1, in <module>
  File "/opt/homebrew/Caskroom/miniconda/base/lib/python3.12/site-packages/PIL/Image.py", line 3513, in open
    fp = builtins.open(filename, "rb")
         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
FileNotFoundError: [Errno 2] No such file or directory: 'assets/objects/gold-key/spritesheets/idle/idle.png'
```

## ❌ prop-atlas-json-matches-png

**Command**: `python -c "import json; from PIL import Image; a=json.load(open('assets/objects/gold-key/spritesheets/idle/idle.atlas.json')); im=Image.open('assets/objects/gold-key/spritesheets/idle/idle.png'); m=a['meta']; assert m['cols']>=1 and m['rows']>=1, f\"grid too small: {m}\"; assert len(a['frames'])==m['cols']*m['rows'], f\"frame count != cols*rows: {m}\"; assert m['sheet_size']['w']==im.size[0] and m['sheet_size']['h']==im.size[1], f\"atlas/sheet size mismatch: atlas={m['sheet_size']} png={im.size}\""
`
**Exit code**: 1
**Output**:
```
Traceback (most recent call last):
  File "<string>", line 1, in <module>
FileNotFoundError: [Errno 2] No such file or directory: 'assets/objects/gold-key/spritesheets/idle/idle.atlas.json'
```

## ❌ prop-prompt-saved

**Command**: `test -s assets/objects/gold-key/spritesheets/idle/idle.prompt.txt`
**Exit code**: 1
