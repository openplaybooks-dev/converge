# FEEDBACK.md — Check Results

**Status**: ❌ 3/3 check(s) failed

- ❌ **page-exists**
- ❌ **covers-learn-md**
- ❌ **contrasts-retry-and-hope**

## ❌ page-exists

**Command**: `test -f docs/concepts/self-correction.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f docs/concepts/self-correction.md
```

## ❌ covers-learn-md

**Command**: `grep -q 'LEARN\.md' docs/concepts/self-correction.md`
**Exit code**: 2
**Output**:
```
grep: docs/concepts/self-correction.md: No such file or directory
```

## ❌ contrasts-retry-and-hope

**Command**: `grep -qiE 'retry|context|feedback' docs/concepts/self-correction.md`
**Exit code**: 2
**Output**:
```
grep: docs/concepts/self-correction.md: No such file or directory
```
