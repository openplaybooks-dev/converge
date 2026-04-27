# FEEDBACK.md — Check Results

**Status**: ❌ 3/4 check(s) failed

- ❌ **root-page-exists**
- ❌ **studio-route-group-removed**
- ❌ **playbooks-routes-at-root**
- ✅ **typecheck-passes**

## ❌ root-page-exists

**Command**: `test -f packages/converge-studio/src/app/page.tsx`
**Exit code**: 1
**Output**:
```
Command failed: test -f packages/converge-studio/src/app/page.tsx
```

## ❌ studio-route-group-removed

**Command**: `test ! -d 'packages/converge-studio/src/app/(studio)'`
**Exit code**: 1
**Output**:
```
Command failed: test ! -d 'packages/converge-studio/src/app/(studio)'
```

## ❌ playbooks-routes-at-root

**Command**: `test -f 'packages/converge-studio/src/app/playbooks/[name]/page.tsx' && test -f 'packages/converge-studio/src/app/runs/page.tsx'`
**Exit code**: 1
**Output**:
```
Command failed: test -f 'packages/converge-studio/src/app/playbooks/[name]/page.tsx' && test -f 'packages/converge-studio/src/app/runs/page.tsx'
```
