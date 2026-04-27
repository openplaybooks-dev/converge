# FEEDBACK.md — Check Results

**Status**: ❌ 2/3 check(s) failed

- ❌ **session-export-route-exists**
- ❌ **playbook-export-route-exists**
- ✅ **typecheck-passes**

## ❌ session-export-route-exists

**Command**: `test -f 'packages/converge-studio/src/app/api/runs/[playbook]/[sessionId]/export/route.ts'`
**Exit code**: 1
**Output**:
```
Command failed: test -f 'packages/converge-studio/src/app/api/runs/[playbook]/[sessionId]/export/route.ts'
```

## ❌ playbook-export-route-exists

**Command**: `test -f 'packages/converge-studio/src/app/api/playbooks/[name]/export/route.ts'`
**Exit code**: 1
**Output**:
```
Command failed: test -f 'packages/converge-studio/src/app/api/playbooks/[name]/export/route.ts'
```
