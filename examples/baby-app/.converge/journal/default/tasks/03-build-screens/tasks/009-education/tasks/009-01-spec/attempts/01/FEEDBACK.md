# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **spec-exists**
- ❌ **spec-has-content**

## ❌ spec-exists

**Command**: `test -f .stitch/designs/education/SPEC.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f .stitch/designs/education/SPEC.md
```

## ❌ spec-has-content

**Command**: `test $(wc -l < .stitch/designs/education/SPEC.md) -gt 50`
**Exit code**: 2
**Output**:
```
/bin/bash: .stitch/designs/education/SPEC.md: No such file or directory
/bin/bash: line 0: test: -gt: unary operator expected
```
