# FEEDBACK.md — Check Results

**Status**: ❌ 4/4 check(s) failed

- ❌ **report-exists**
- ❌ **zero-stale-claims**
- ❌ **zero-missing-sources**
- ❌ **pre-flight-passes**

## ❌ report-exists

**Command**: `test -f docs/_validation-report.json && node -e "JSON.parse(require('fs').readFileSync('docs/_validation-report.json','utf8'))"`
**Exit code**: 1
**Output**:
```
Command failed: test -f docs/_validation-report.json && node -e "JSON.parse(require('fs').readFileSync('docs/_validation-report.json','utf8'))"
```

## ❌ zero-stale-claims

**Command**: `node -e "const r=require('./docs/_validation-report.json');process.exit((r.staleClaims||[]).length===0?0:1)"`
**Exit code**: 1
**Output**:
```
node:internal/modules/cjs/loader:1386
  throw err;
  ^

Error: Cannot find module './docs/_validation-report.json'
Require stack:
- /Users/minh/Documents/converge/[eval]
    at Function._resolveFilename (node:internal/modules/cjs/loader:1383:15)
    at defaultResolveImpl (node:internal/modules/cjs/loader:1025:19)
    at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1030:22)
    at Function._load (node:internal/modules/cjs/loader:1192:37)
    at TracingChannel.traceSync (node:diagnostics_channel:322:14)
    at wrapModuleLoad (node:internal/modules/cjs/loader:237:24)
    at Module.require (node:internal/modules/cjs/loader:1463:12)
    at require (node:internal/modules/helpers:147:16)
    at [eval]:1:9
    at runScriptInThisContext (node:internal/vm:209:10) {
  code: 'MODULE_NOT_FOUND',
  requireStack: [ '/Users/minh/Documents/converge/[eval]' ]
}

Node.js v22.19.0
```

## ❌ zero-missing-sources

**Command**: `node -e "const r=require('./docs/_validation-report.json');process.exit((r.missingSources||[]).length===0?0:1)"`
**Exit code**: 1
**Output**:
```
node:internal/modules/cjs/loader:1386
  throw err;
  ^

Error: Cannot find module './docs/_validation-report.json'
Require stack:
- /Users/minh/Documents/converge/[eval]
    at Function._resolveFilename (node:internal/modules/cjs/loader:1383:15)
    at defaultResolveImpl (node:internal/modules/cjs/loader:1025:19)
    at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1030:22)
    at Function._load (node:internal/modules/cjs/loader:1192:37)
    at TracingChannel.traceSync (node:diagnostics_channel:322:14)
    at wrapModuleLoad (node:internal/modules/cjs/loader:237:24)
    at Module.require (node:internal/modules/cjs/loader:1463:12)
    at require (node:internal/modules/helpers:147:16)
    at [eval]:1:9
    at runScriptInThisContext (node:internal/vm:209:10) {
  code: 'MODULE_NOT_FOUND',
  requireStack: [ '/Users/minh/Documents/converge/[eval]' ]
}

Node.js v22.19.0
```

## ❌ pre-flight-passes

**Command**: `node .converge/playbooks/docs/scripts/validate-docs.mjs`
**Exit code**: 1
**Output**:
```
validate-docs: 1 pages reference missing sources:
  ✗ docs/getting-started/your-first-playbook.md → missing examples/*/.converge/playbooks/*/playbook.yml

validate-docs: 2 pages may be stale (source modified after page):
  ⚠ docs/reference/cli/index.md (last refreshed 2h ago) ← packages/cli/src/main.ts (modified 51m ago)
  ⚠ docs/guides/read-the-journal.md (last refreshed 2h ago) ← .converge/journal/ (modified 23m ago)

FAIL: validate-docs found unrecoverable issues across 22 pages.
```
