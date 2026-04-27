# FEEDBACK.md — Check Results

**Status**: ❌ 5/6 check(s) failed

- ❌ **page-exists**
- ❌ **page-frontmatter**
- ❌ **shows-journal-path**
- ❌ **shows-learn-md**
- ❌ **shows-cat-or-jq**
- ✅ **word-count-ok**

## ❌ page-exists

**Command**: `test -f docs/guides/read-the-journal.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f docs/guides/read-the-journal.md
```

## ❌ page-frontmatter

**Command**: `head -10 docs/guides/read-the-journal.md | grep -q '^title:' && head -10 docs/guides/read-the-journal.md | grep -q '^sources:'`
**Exit code**: 1
**Output**:
```
head: docs/guides/read-the-journal.md: No such file or directory
```

## ❌ shows-journal-path

**Command**: `grep -qE '\.converge/journal' docs/guides/read-the-journal.md`
**Exit code**: 2
**Output**:
```
grep: docs/guides/read-the-journal.md: No such file or directory
```

## ❌ shows-learn-md

**Command**: `grep -qE 'LEARN\.md' docs/guides/read-the-journal.md`
**Exit code**: 2
**Output**:
```
grep: docs/guides/read-the-journal.md: No such file or directory
```

## ❌ shows-cat-or-jq

**Command**: `grep -qE 'cat|jq|tail|less' docs/guides/read-the-journal.md`
**Exit code**: 2
**Output**:
```
grep: docs/guides/read-the-journal.md: No such file or directory
```
