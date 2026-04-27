# FEEDBACK.md — Check Results

**Status**: ❌ 2/4 check(s) failed

- ❌ **studio-dir-exists**
- ✅ **prisma-removed**
- ✅ **adapters-removed**
- ❌ **upstream-sha-pinned**

## ❌ studio-dir-exists

**Command**: `test -d packages/converge-studio/src/app && test -f packages/converge-studio/next.config.mjs -o -f packages/converge-studio/next.config.js`
**Exit code**: 1
**Output**:
```
Command failed: test -d packages/converge-studio/src/app && test -f packages/converge-studio/next.config.mjs -o -f packages/converge-studio/next.config.js
```

## ❌ upstream-sha-pinned

**Command**: `test -s packages/converge-studio/UPSTREAM_SHA && grep -qE '^[0-9a-f]{7,40}' packages/converge-studio/UPSTREAM_SHA`
**Exit code**: 1
**Output**:
```
Command failed: test -s packages/converge-studio/UPSTREAM_SHA && grep -qE '^[0-9a-f]{7,40}' packages/converge-studio/UPSTREAM_SHA
```
