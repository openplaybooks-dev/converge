# FEEDBACK.md — Check Results

**Status**: ❌ 1/1 check(s) failed

- ❌ **install-resolves**

## ❌ install-resolves

**Command**: `pnpm install --frozen-lockfile=false 2>&1 | tail -3 | grep -qE 'Done|+|installed' || pnpm install 2>&1 | tail -3`
**Exit code**: 124
**Output**:
```
grep: repetition-operator operand invalid
```
