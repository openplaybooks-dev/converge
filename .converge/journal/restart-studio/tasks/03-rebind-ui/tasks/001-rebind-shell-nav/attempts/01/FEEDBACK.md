# FEEDBACK.md — Check Results

**Status**: ❌ 1/2 check(s) failed

- ❌ **nav-has-converge-routes**
- ✅ **header-uses-converge-data**

## ❌ nav-has-converge-routes

**Command**: `grep -q '/playbooks' packages/studio/src/components/layout/nav-rail.tsx && grep -q '/runs' packages/studio/src/components/layout/nav-rail.tsx && grep -q '/settings' packages/studio/src/components/layout/nav-rail.tsx`
**Exit code**: 1
**Output**:
```
Command failed: grep -q '/playbooks' packages/studio/src/components/layout/nav-rail.tsx && grep -q '/runs' packages/studio/src/components/layout/nav-rail.tsx && grep -q '/settings' packages/studio/src/components/layout/nav-rail.tsx
```
