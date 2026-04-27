# FEEDBACK.md — Check Results

**Status**: ❌ 3/3 check(s) failed

- ❌ **page-exists**
- ❌ **covers-journal**
- ❌ **covers-debugging**

## ❌ page-exists

**Command**: `test -f docs/concepts/filesystem-as-plan.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f docs/concepts/filesystem-as-plan.md
```

## ❌ covers-journal

**Command**: `grep -qiE '\.converge/journal' docs/concepts/filesystem-as-plan.md`
**Exit code**: 2
**Output**:
```
grep: docs/concepts/filesystem-as-plan.md: No such file or directory
```

## ❌ covers-debugging

**Command**: `grep -qiE 'cat|grep|ls|tail|debug' docs/concepts/filesystem-as-plan.md`
**Exit code**: 2
**Output**:
```
grep: docs/concepts/filesystem-as-plan.md: No such file or directory
```
