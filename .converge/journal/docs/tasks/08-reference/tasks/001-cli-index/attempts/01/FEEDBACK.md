# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **page-exists**
- ❌ **lists-commands**

## ❌ page-exists

**Command**: `test -f docs/reference/cli/index.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f docs/reference/cli/index.md
```

## ❌ lists-commands

**Command**: `test $(grep -cE '^\*?\s*\[?\s*`?converge\s+\w+' docs/reference/cli/index.md) -ge 8`
**Exit code**: 2
**Output**:
```
grep: docs/reference/cli/index.md: No such file or directory
/bin/bash: line 0: test: -ge: unary operator expected
```
