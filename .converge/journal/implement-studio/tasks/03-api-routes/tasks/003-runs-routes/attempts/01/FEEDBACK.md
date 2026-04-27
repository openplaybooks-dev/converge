# FEEDBACK.md — Check Results

**Status**: ❌ 2/3 check(s) failed

- ❌ **runs-routes-exist**
- ❌ **nodejs-runtime**
- ✅ **typecheck**

## ❌ runs-routes-exist

**Command**: `test -f packages/converge-studio/src/app/api/runs/route.ts && test -f 'packages/converge-studio/src/app/api/runs/[playbook]/[sessionId]/route.ts' && test -f 'packages/converge-studio/src/app/api/runs/[playbook]/[sessionId]/events/route.ts' && test -f 'packages/converge-studio/src/app/api/runs/[playbook]/[sessionId]/stream/route.ts'`
**Exit code**: 1
**Output**:
```
Command failed: test -f packages/converge-studio/src/app/api/runs/route.ts && test -f 'packages/converge-studio/src/app/api/runs/[playbook]/[sessionId]/route.ts' && test -f 'packages/converge-studio/src/app/api/runs/[playbook]/[sessionId]/events/route.ts' && test -f 'packages/converge-studio/src/app/api/runs/[playbook]/[sessionId]/stream/route.ts'
```

## ❌ nodejs-runtime

**Command**: `find packages/converge-studio/src/app/api/runs -name 'route.ts' | xargs grep -l "runtime = 'nodejs'" | wc -l | xargs test 4 -eq`
**Exit code**: 1
**Output**:
```
find: packages/converge-studio/src/app/api/runs: No such file or directory
```
