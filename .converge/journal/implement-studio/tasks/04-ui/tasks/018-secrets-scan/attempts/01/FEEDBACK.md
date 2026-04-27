# FEEDBACK.md — Check Results

**Status**: ❌ 3/4 check(s) failed

- ❌ **scan-lib-exists**
- ❌ **scan-api-exists**
- ❌ **card-component-exists**
- ✅ **typecheck-passes**

## ❌ scan-lib-exists

**Command**: `test -f packages/converge-studio/src/lib/secrets-scan.ts`
**Exit code**: 1
**Output**:
```
Command failed: test -f packages/converge-studio/src/lib/secrets-scan.ts
```

## ❌ scan-api-exists

**Command**: `test -f 'packages/converge-studio/src/app/api/playbooks/[name]/secrets-scan/route.ts'`
**Exit code**: 1
**Output**:
```
Command failed: test -f 'packages/converge-studio/src/app/api/playbooks/[name]/secrets-scan/route.ts'
```

## ❌ card-component-exists

**Command**: `test -f packages/converge-studio/src/components/secrets-scan-card.tsx`
**Exit code**: 1
**Output**:
```
Command failed: test -f packages/converge-studio/src/components/secrets-scan-card.tsx
```
