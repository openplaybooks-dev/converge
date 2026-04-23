# FEEDBACK.md — Check Results

**Status**: ❌ 1/2 check(s) failed

- ❌ **models-dir-exists**
- ✅ **dart-analysis**

## ❌ models-dir-exists

**Command**: `find lib/models -name '*.dart' -type f | wc -l | awk '{if ($1 > 0) exit 0; exit 1}'`
**Exit code**: 1
**Output**:
```
Command failed: find lib/models -name '*.dart' -type f | wc -l | awk '{if ($1 > 0) exit 0; exit 1}'
```
