# FEEDBACK.md — Check Results

**Status**: ❌ 4/4 check(s) failed

- ❌ **page-exists**
- ❌ **documents-id-and-outputs**
- ❌ **documents-checks**
- ❌ **documents-wbs**

## ❌ page-exists

**Command**: `test -f docs/reference/task-md.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f docs/reference/task-md.md
```

## ❌ documents-id-and-outputs

**Command**: `grep -qE '`id`|^###\s+id' docs/reference/task-md.md && grep -qE '`outputs`|^###\s+outputs' docs/reference/task-md.md`
**Exit code**: 2
**Output**:
```
grep: docs/reference/task-md.md: No such file or directory
```

## ❌ documents-checks

**Command**: `grep -qE '`checks`|^###\s+checks' docs/reference/task-md.md`
**Exit code**: 2
**Output**:
```
grep: docs/reference/task-md.md: No such file or directory
```

## ❌ documents-wbs

**Command**: `grep -qiE 'wbs' docs/reference/task-md.md`
**Exit code**: 2
**Output**:
```
grep: docs/reference/task-md.md: No such file or directory
```
