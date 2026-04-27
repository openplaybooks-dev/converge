# FEEDBACK.md — Check Results

**Status**: ❌ 1/1 check(s) failed

- ❌ **no-mc-string**

## ❌ no-mc-string

**Command**: `test -z "$(grep -ril 'mission control' packages/converge-studio/src packages/converge-studio/messages 2>/dev/null)"`
**Exit code**: 1
**Output**:
```
Command failed: test -z "$(grep -ril 'mission control' packages/converge-studio/src packages/converge-studio/messages 2>/dev/null)"
```
