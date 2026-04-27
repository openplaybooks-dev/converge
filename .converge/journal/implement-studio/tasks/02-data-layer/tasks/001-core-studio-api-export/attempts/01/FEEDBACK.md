# FEEDBACK.md — Check Results

**Status**: ❌ 3/3 check(s) failed

- ❌ **studio-api-file-exists**
- ❌ **exports-entry**
- ❌ **import-resolves**

## ❌ studio-api-file-exists

**Command**: `test -f packages/core/src/studio-api.ts`
**Exit code**: 1
**Output**:
```
Command failed: test -f packages/core/src/studio-api.ts
```

## ❌ exports-entry

**Command**: `node -e "const e=require('./packages/core/package.json').exports;process.exit(e['./studio-api']?0:1)"`
**Exit code**: 1
**Output**:
```
Command failed: node -e "const e=require('./packages/core/package.json').exports;process.exit(e['./studio-api']?0:1)"
```

## ❌ import-resolves

**Command**: `cd packages/core && pnpm build 2>&1 | tail -3 && node --input-type=module -e "import('@converge/core/studio-api').then(m=>{if(!m.SimpleLogTailer||!m.loadPlaybook)process.exit(1)}).catch(e=>{console.error(e);process.exit(1)})"`
**Exit code**: 1
**Output**:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/Users/minh/Documents/converge/packages/core/src/studio-api' imported from /Users/minh/Documents/converge/packages/core/[eval1]
    at finalizeResolution (node:internal/modules/esm/resolve:274:11)
    at moduleResolve (node:internal/modules/esm/resolve:859:10)
    at defaultResolve (node:internal/modules/esm/resolve:983:11)
    at #cachedDefaultResolve (node:internal/modules/esm/loader:717:20)
    at ModuleLoader.resolve (node:internal/modules/esm/loader:694:38)
    at ModuleLoader.getModuleJobForImport (node:internal/modules/esm/loader:308:38)
    at onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:650:36)
    at TracingChannel.tracePromise (node:diagnostics_channel:344:14)
    at ModuleLoader.import (node:internal/modules/esm/loader:649:21)
    at defaultImportModuleDynamicallyForModule (node:internal/modules/esm/utils:222:31) {
  code: 'ERR_MODULE_NOT_FOUND',
  url: 'file:///Users/minh/Documents/converge/packages/core/src/studio-api'
}
ESM dist/index.js      1.79 MB
ESM dist/index.js.map  4.23 MB
ESM ⚡️ Build success in 1381ms
```
