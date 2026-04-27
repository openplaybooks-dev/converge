# FEEDBACK.md — Check Results

**Status**: ❌ 2/3 check(s) failed

- ❌ **routes-exist**
- ❌ **nodejs-runtime**
- ✅ **typecheck**

## ❌ routes-exist

**Command**: `test -f packages/converge-studio/src/app/api/playbooks/route.ts && test -f 'packages/converge-studio/src/app/api/playbooks/[name]/route.ts'`
**Exit code**: 1
**Output**:
```
Command failed: test -f packages/converge-studio/src/app/api/playbooks/route.ts && test -f 'packages/converge-studio/src/app/api/playbooks/[name]/route.ts'
```

## ❌ nodejs-runtime

**Command**: `grep -l "runtime = 'nodejs'" packages/converge-studio/src/app/api/playbooks/route.ts 'packages/converge-studio/src/app/api/playbooks/[name]/route.ts' | wc -l | xargs test 2 -eq`
**Exit code**: 1
**Output**:
```
grep: packages/converge-studio/src/app/api/playbooks/route.ts: No such file or directory
grep: packages/converge-studio/src/app/api/playbooks/[name]/route.ts: No such file or directory
```
