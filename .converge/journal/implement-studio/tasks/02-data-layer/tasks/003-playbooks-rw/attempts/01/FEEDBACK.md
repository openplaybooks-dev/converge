# FEEDBACK.md — Check Results

**Status**: ❌ 2/3 check(s) failed

- ❌ **playbooks-module-exists**
- ✅ **typecheck**
- ❌ **list-real-playbooks**

## ❌ playbooks-module-exists

**Command**: `test -f packages/converge-studio/src/lib/converge-adapter/playbooks.ts`
**Exit code**: 1
**Output**:
```
Command failed: test -f packages/converge-studio/src/lib/converge-adapter/playbooks.ts
```

## ❌ list-real-playbooks

**Command**: `cd packages/converge-studio && CONVERGE_PROJECT_ROOT=/Users/minh/Documents/converge node --input-type=module -e "import('./src/lib/converge-adapter/playbooks.ts').then(async m=>{const ps=await m.listPlaybooks();process.exit(ps.find(p=>p.name==='oss-standardize')?0:1)}).catch(e=>{console.error(e);process.exit(1)})"`
**Exit code**: 1
**Output**:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/Users/minh/Documents/converge/packages/converge-studio/src/lib/converge-adapter/playbooks.ts' imported from /Users/minh/Documents/converge/packages/converge-studio/[eval1]
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
  url: 'file:///Users/minh/Documents/converge/packages/converge-studio/src/lib/converge-adapter/playbooks.ts'
}
```
