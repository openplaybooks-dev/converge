# FEEDBACK.md — Check Results

**Status**: ❌ 3/3 check(s) failed

- ❌ **page-exists**
- ❌ **lists-exports**
- ❌ **covers-exports-map**

## ❌ page-exists

**Command**: `test -f docs/reference/core-api.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f docs/reference/core-api.md
```

## ❌ lists-exports

**Command**: `test $(grep -cE '^###\s+|`[A-Z][a-zA-Z]+`' docs/reference/core-api.md) -ge 8`
**Exit code**: 2
**Output**:
```
grep: docs/reference/core-api.md: No such file or directory
/bin/bash: line 0: test: -ge: unary operator expected
```

## ❌ covers-exports-map

**Command**: `grep -qE '@converge/core|exports' docs/reference/core-api.md`
**Exit code**: 2
**Output**:
```
grep: docs/reference/core-api.md: No such file or directory
```
