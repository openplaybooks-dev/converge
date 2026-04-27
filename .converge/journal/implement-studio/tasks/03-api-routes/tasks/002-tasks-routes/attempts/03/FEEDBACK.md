# FEEDBACK.md — Check Results

**Status**: ❌ 2/3 check(s) failed

- ❌ **tasks-routes-exist**
- ❌ **nodejs-runtime**
- ✅ **typecheck**

## ❌ tasks-routes-exist

**Command**: `test -f 'packages/converge-studio/src/app/api/playbooks/[name]/tasks/route.ts' && test -f 'packages/converge-studio/src/app/api/playbooks/[name]/tasks/[...path]/route.ts' && test -f 'packages/converge-studio/src/app/api/playbooks/[name]/tasks/[...path]/reset/route.ts'`
**Exit code**: 1
**Output**:
```
Command failed: test -f 'packages/converge-studio/src/app/api/playbooks/[name]/tasks/route.ts' && test -f 'packages/converge-studio/src/app/api/playbooks/[name]/tasks/[...path]/route.ts' && test -f 'packages/converge-studio/src/app/api/playbooks/[name]/tasks/[...path]/reset/route.ts'
```

## ❌ nodejs-runtime

**Command**: `find 'packages/converge-studio/src/app/api/playbooks/[name]/tasks' -name 'route.ts' | xargs grep -l "runtime = 'nodejs'" | wc -l | xargs test 3 -eq`
**Exit code**: 1
**Output**:
```
Command failed: find 'packages/converge-studio/src/app/api/playbooks/[name]/tasks' -name 'route.ts' | xargs grep -l "runtime = 'nodejs'" | wc -l | xargs test 3 -eq
```
