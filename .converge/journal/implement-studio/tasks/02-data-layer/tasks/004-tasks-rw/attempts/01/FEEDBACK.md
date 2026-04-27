# FEEDBACK.md — Check Results

**Status**: ❌ 2/3 check(s) failed

- ❌ **tasks-module-exists**
- ✅ **typecheck**
- ❌ **read-real-task**

## ❌ tasks-module-exists

**Command**: `test -f packages/converge-studio/src/lib/converge-adapter/tasks.ts && test -f packages/converge-studio/src/lib/converge-adapter/frontmatter.ts`
**Exit code**: 1
**Output**:
```
Command failed: test -f packages/converge-studio/src/lib/converge-adapter/tasks.ts && test -f packages/converge-studio/src/lib/converge-adapter/frontmatter.ts
```

## ❌ read-real-task

**Command**: `cd packages/converge-studio && CONVERGE_PROJECT_ROOT=/Users/minh/Documents/converge tsx -e "import('./src/lib/converge-adapter/tasks.ts').then(async m=>{const t=await m.readTaskMd('oss-standardize','01-brand');process.exit(t.frontmatter.title==='Brand Consolidation'?0:1)}).catch(e=>{console.error(e);process.exit(1)})"`
**Exit code**: 1
**Output**:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/Users/minh/Documents/converge/packages/converge-studio/src/lib/converge-adapter/tasks.ts' imported from /Users/minh/Documents/converge/packages/converge-studio/[eval]
    at finalizeResolution (node:internal/modules/esm/resolve:274:11)
    at moduleResolve (node:internal/modules/esm/resolve:859:10)
    at defaultResolve (node:internal/modules/esm/resolve:983:11)
    at nextResolve (node:internal/modules/esm/hooks:748:28)
    at resolveBase (file:///opt/homebrew/lib/node_modules/tsx/dist/esm/index.mjs?1777169900863:2:3744)
    at async resolveDirectory (file:///opt/homebrew/lib/node_modules/tsx/dist/esm/index.mjs?1777169900863:2:4237)
    at async resolve (file:///opt/homebrew/lib/node_modules/tsx/dist/esm/index.mjs?1777169900863:2:5355)
    at async nextResolve (node:internal/modules/esm/hooks:748:22)
    at async Hooks.resolve (node:internal/modules/esm/hooks:240:24)
    at async handleMessage (node:internal/modules/esm/worker:199:18) {
  code: 'ERR_MODULE_NOT_FOUND',
  url: 'file:///Users/minh/Documents/converge/packages/converge-studio/src/lib/converge-adapter/tasks.ts'
}
```
