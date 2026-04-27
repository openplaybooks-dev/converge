# FEEDBACK.md — Check Results

**Status**: ❌ 2/3 check(s) failed

- ❌ **agent-pages-removed**
- ✅ **settings-pruned**
- ❌ **build-or-typecheck-passes**

## ❌ agent-pages-removed

**Command**: `test -z "$(find packages/converge-studio/src/app -type d \( -iname 'agents' -o -iname 'agent-registry' \) 2>/dev/null)"`
**Exit code**: 1
**Output**:
```
Command failed: test -z "$(find packages/converge-studio/src/app -type d \( -iname 'agents' -o -iname 'agent-registry' \) 2>/dev/null)"
```

## ❌ build-or-typecheck-passes

**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`
**Exit code**: 1
**Output**:
```
Command failed: pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq
```
