# FEEDBACK.md — Check Results

**Status**: ❌ 3/3 check(s) failed

- ❌ **design-exists**
- ❌ **meta-exists**
- ❌ **uses-glossary**

## ❌ design-exists

**Command**: `test -f .stitch/designs/mode-selector/design.html`
**Exit code**: 1
**Output**:
```
Command failed: test -f .stitch/designs/mode-selector/design.html
```

## ❌ meta-exists

**Command**: `test -f .stitch/designs/mode-selector/META.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f .stitch/designs/mode-selector/META.md
```

## ❌ uses-glossary

**Command**: `grep -qE 'class="(column|row|card|bottom-sheet|dialog)"' .stitch/designs/mode-selector/design.html`
**Exit code**: 2
**Output**:
```
grep: .stitch/designs/mode-selector/design.html: No such file or directory
```
