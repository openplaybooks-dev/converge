# FEEDBACK.md — Check Results

**Status**: ❌ 4/5 check(s) failed

- ❌ **page-exists**
- ❌ **has-frontmatter**
- ❌ **groups-by-category**
- ❌ **lists-most-examples**
- ✅ **not-too-long**

## ❌ page-exists

**Command**: `test -f docs/examples/index.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f docs/examples/index.md
```

## ❌ has-frontmatter

**Command**: `head -10 docs/examples/index.md | grep -q '^title:' && head -10 docs/examples/index.md | grep -q '^sources:'`
**Exit code**: 1
**Output**:
```
head: docs/examples/index.md: No such file or directory
```

## ❌ groups-by-category

**Command**: `grep -qiE '^##\s+(learning|building software|research|creative|security|agent protocol)' docs/examples/index.md`
**Exit code**: 2
**Output**:
```
grep: docs/examples/index.md: No such file or directory
```

## ❌ lists-most-examples

**Command**: `test $(grep -cE '^\s*-\s+\[|^\*\s+\[' docs/examples/index.md) -ge 15`
**Exit code**: 2
**Output**:
```
grep: docs/examples/index.md: No such file or directory
/bin/bash: line 0: test: -ge: unary operator expected
```
