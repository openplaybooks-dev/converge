# FEEDBACK.md — Check Results

**Status**: ❌ 1/1 check(s) failed

- ❌ **studio-help**

## ❌ studio-help

**Command**: `pnpm --filter @converge/cli build 2>&1 | tail -3 && node packages/cli/dist/index.js studio --help 2>&1 | grep -qi studio`
**Exit code**: 1
**Output**:
```
/Users/minh/Documents/converge/packages/cli:
 ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL  @converge/cli@0.1.0 build: `tsup`
Exit status 1
```
