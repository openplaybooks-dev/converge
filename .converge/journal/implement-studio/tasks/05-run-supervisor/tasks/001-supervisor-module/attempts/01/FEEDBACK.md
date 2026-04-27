# FEEDBACK.md — Check Results

**Status**: ❌ 2/3 check(s) failed

- ❌ **module-exists**
- ✅ **typecheck**
- ❌ **api-surface**

## ❌ module-exists

**Command**: `test -f packages/converge-studio/src/lib/run-supervisor.ts && test -f packages/converge-studio/src/lib/ring-buffer.ts`
**Exit code**: 1
**Output**:
```
Command failed: test -f packages/converge-studio/src/lib/run-supervisor.ts && test -f packages/converge-studio/src/lib/ring-buffer.ts
```

## ❌ api-surface

**Command**: `grep -q 'export function startRun\|export const startRun' packages/converge-studio/src/lib/run-supervisor.ts && grep -q 'export function getRun\|export const getRun' packages/converge-studio/src/lib/run-supervisor.ts && grep -q 'export function listRuns\|export const listRuns' packages/converge-studio/src/lib/run-supervisor.ts`
**Exit code**: 2
**Output**:
```
grep: packages/converge-studio/src/lib/run-supervisor.ts: No such file or directory
```
