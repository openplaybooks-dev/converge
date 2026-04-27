# FEEDBACK.md — Check Results

**Status**: ❌ 3/4 check(s) failed

- ❌ **schedule-api-exists**
- ❌ **schedule-form-exists**
- ❌ **adapter-helper-exists**
- ✅ **typecheck-passes**

## ❌ schedule-api-exists

**Command**: `test -f 'packages/converge-studio/src/app/api/playbooks/[name]/schedule/route.ts'`
**Exit code**: 1
**Output**:
```
Command failed: test -f 'packages/converge-studio/src/app/api/playbooks/[name]/schedule/route.ts'
```

## ❌ schedule-form-exists

**Command**: `test -f packages/converge-studio/src/components/schedule-form.tsx`
**Exit code**: 1
**Output**:
```
Command failed: test -f packages/converge-studio/src/components/schedule-form.tsx
```

## ❌ adapter-helper-exists

**Command**: `test -f packages/converge-studio/src/lib/converge-adapter/schedule.ts && grep -q 'readSchedule\|writeSchedule' packages/converge-studio/src/lib/converge-adapter/schedule.ts`
**Exit code**: 1
**Output**:
```
Command failed: test -f packages/converge-studio/src/lib/converge-adapter/schedule.ts && grep -q 'readSchedule\|writeSchedule' packages/converge-studio/src/lib/converge-adapter/schedule.ts
```
