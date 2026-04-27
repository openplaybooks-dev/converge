# FEEDBACK.md — Check Results

**Status**: ❌ 4/4 check(s) failed

- ❌ **page-exists**
- ❌ **page-frontmatter**
- ❌ **lists-most-symptoms**
- ❌ **links-to-read-the-journal**

## ❌ page-exists

**Command**: `test -f docs/troubleshooting/index.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f docs/troubleshooting/index.md
```

## ❌ page-frontmatter

**Command**: `head -10 docs/troubleshooting/index.md | grep -q '^title:' && head -10 docs/troubleshooting/index.md | grep -q '^sources:'`
**Exit code**: 1
**Output**:
```
head: docs/troubleshooting/index.md: No such file or directory
```

## ❌ lists-most-symptoms

**Command**: `test $(grep -cE '^\s*-\s+\[|^\*\s+\[|^[0-9]+\.\s+\[' docs/troubleshooting/index.md) -ge 10`
**Exit code**: 2
**Output**:
```
grep: docs/troubleshooting/index.md: No such file or directory
/bin/bash: line 0: test: -ge: unary operator expected
```

## ❌ links-to-read-the-journal

**Command**: `grep -qE '/guides/read-the-journal|\.\./guides/read-the-journal' docs/troubleshooting/index.md`
**Exit code**: 2
**Output**:
```
grep: docs/troubleshooting/index.md: No such file or directory
```
