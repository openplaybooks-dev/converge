# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **detail-page-exists**
- ❌ **detail-tabs-component-exists**

## ❌ detail-page-exists

**Command**: `test -f 'packages/studio/src/app/playbooks/[name]/page.tsx'`
**Exit code**: 1
**Output**:
```
Command failed: test -f 'packages/studio/src/app/playbooks/[name]/page.tsx'
```

## ❌ detail-tabs-component-exists

**Command**: `test -f packages/studio/src/components/playbook-detail-tabs.tsx && grep -q 'Overview' packages/studio/src/components/playbook-detail-tabs.tsx && grep -q 'Tasks' packages/studio/src/components/playbook-detail-tabs.tsx && grep -q 'Runs' packages/studio/src/components/playbook-detail-tabs.tsx && grep -q 'Config' packages/studio/src/components/playbook-detail-tabs.tsx`
**Exit code**: 1
**Output**:
```
Command failed: test -f packages/studio/src/components/playbook-detail-tabs.tsx && grep -q 'Overview' packages/studio/src/components/playbook-detail-tabs.tsx && grep -q 'Tasks' packages/studio/src/components/playbook-detail-tabs.tsx && grep -q 'Runs' packages/studio/src/components/playbook-detail-tabs.tsx && grep -q 'Config' packages/studio/src/components/playbook-detail-tabs.tsx
```
