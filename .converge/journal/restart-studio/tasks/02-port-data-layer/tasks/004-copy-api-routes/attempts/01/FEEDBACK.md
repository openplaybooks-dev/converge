# FEEDBACK.md — Check Results

**Status**: ❌ 1/1 check(s) failed

- ❌ **api-routes-all-copied**

## ❌ api-routes-all-copied

**Command**: `for d in playbooks runs run watch events search settings; do test -d packages/studio/src/app/api/$d || exit 1; done`
**Exit code**: 1
**Output**:
```
Command failed: for d in playbooks runs run watch events search settings; do test -d packages/studio/src/app/api/$d || exit 1; done
```
