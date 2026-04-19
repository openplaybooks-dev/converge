# FEEDBACK.md — Check Results

**Status**: ❌ 2/3 check(s) failed

- ❌ **svg-exists**
- ❌ **svg-valid**
- ✅ **svg-size-reasonable**

## ❌ svg-exists

**Command**: `test -f assets/illustrations/baby-sizes/week-21.svg`
**Exit code**: 1
**Output**:
```
Command failed: test -f assets/illustrations/baby-sizes/week-21.svg
```

## ❌ svg-valid

**Command**: `head -5 assets/illustrations/baby-sizes/week-21.svg | grep -q '<svg'`
**Exit code**: 1
**Output**:
```
head: assets/illustrations/baby-sizes/week-21.svg: No such file or directory
```
