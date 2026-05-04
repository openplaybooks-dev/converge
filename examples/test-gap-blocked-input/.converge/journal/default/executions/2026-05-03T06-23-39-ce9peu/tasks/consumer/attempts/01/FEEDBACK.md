# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **consumed-output**
- ❌ **producer-retry-gate**

## ❌ consumed-output

**Command**: `test -f CONSUMED_OUTPUT.txt && grep -q "producer-ok-consumed" CONSUMED_OUTPUT.txt`
**Exit code**: 1

## ❌ producer-retry-gate

**Command**: `find .converge/journal -path '*/producer/attempts/02/CHECK.result.md' 2>/dev/null | grep -q CHECK`
**Exit code**: 1
