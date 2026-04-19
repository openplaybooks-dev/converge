# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **spec-exists**
- ❌ **spec-has-content**

## ❌ spec-exists

**Command**: `test -f .stitch/designs/due-date-picker/SPEC.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f .stitch/designs/due-date-picker/SPEC.md
```

## ❌ spec-has-content

**Command**: `test $(wc -l < .stitch/designs/due-date-picker/SPEC.md) -gt 30`
**Exit code**: 2
**Output**:
```
/bin/bash: .stitch/designs/due-date-picker/SPEC.md: No such file or directory
/bin/bash: line 0: test: -gt: unary operator expected
```
