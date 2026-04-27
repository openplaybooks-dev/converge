# FEEDBACK.md — Check Results

**Status**: ❌ 2/3 check(s) failed

- ❌ **correlator-exists**
- ✅ **typecheck**
- ❌ **integrated**

## ❌ correlator-exists

**Command**: `test -f packages/converge-studio/src/lib/session-correlator.ts`
**Exit code**: 1
**Output**:
```
Command failed: test -f packages/converge-studio/src/lib/session-correlator.ts
```

## ❌ integrated

**Command**: `grep -q 'session-correlator\|attachCorrelator' packages/converge-studio/src/lib/run-supervisor.ts`
**Exit code**: 1
**Output**:
```
Command failed: grep -q 'session-correlator\|attachCorrelator' packages/converge-studio/src/lib/run-supervisor.ts
```
