# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **messaging-exists**
- ❌ **messaging-has-tagline**

## ❌ messaging-exists

**Command**: `test -f docs/brand-messaging.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f docs/brand-messaging.md
```

## ❌ messaging-has-tagline

**Command**: `grep -qi 'tagline\|one-liner' docs/brand-messaging.md`
**Exit code**: 2
**Output**:
```
grep: docs/brand-messaging.md: No such file or directory
```
