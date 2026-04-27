# FEEDBACK.md — Check Results

**Status**: ❌ 3/4 check(s) failed

- ❌ **command-file-exists**
- ❌ **registered-in-main**
- ❌ **optional-dep-on-studio**
- ✅ **studio-help**

## ❌ command-file-exists

**Command**: `test -f packages/cli/src/commands-studio.ts`
**Exit code**: 1
**Output**:
```
Command failed: test -f packages/cli/src/commands-studio.ts
```

## ❌ registered-in-main

**Command**: `grep -q 'commands-studio\|runStudio' packages/cli/src/main.ts`
**Exit code**: 1
**Output**:
```
Command failed: grep -q 'commands-studio\|runStudio' packages/cli/src/main.ts
```

## ❌ optional-dep-on-studio

**Command**: `node -e "const p=require('./packages/cli/package.json');process.exit(p.optionalDependencies&&p.optionalDependencies['@converge/studio']?0:1)"`
**Exit code**: 1
**Output**:
```
Command failed: node -e "const p=require('./packages/cli/package.json');process.exit(p.optionalDependencies&&p.optionalDependencies['@converge/studio']?0:1)"
```
