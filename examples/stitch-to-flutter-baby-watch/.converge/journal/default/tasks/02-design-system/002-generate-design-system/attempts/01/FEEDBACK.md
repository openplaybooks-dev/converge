# FEEDBACK.md — Check Results

**Status**: ❌ 3/3 check(s) failed

- ❌ **design-md-exists**
- ❌ **design-md-has-colors**
- ❌ **design-md-has-typography**

## ❌ design-md-exists

**Command**: `test -f .stitch/system/DESIGN.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f .stitch/system/DESIGN.md
```

## ❌ design-md-has-colors

**Command**: `grep -q "Color Palette" .stitch/system/DESIGN.md`
**Exit code**: 2
**Output**:
```
grep: .stitch/system/DESIGN.md: No such file or directory
```

## ❌ design-md-has-typography

**Command**: `grep -q "Typography" .stitch/system/DESIGN.md`
**Exit code**: 2
**Output**:
```
grep: .stitch/system/DESIGN.md: No such file or directory
```
