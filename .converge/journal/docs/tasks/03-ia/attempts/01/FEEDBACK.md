# FEEDBACK.md — Check Results

**Status**: ❌ 7/7 check(s) failed

- ❌ **ia-json-exists**
- ❌ **ia-has-six-groups**
- ❌ **ia-getting-started-has-5-pages**
- ❌ **ia-examples-has-glob**
- ❌ **ia-troubleshooting-has-glob**
- ❌ **ia-reference-has-cli-glob**
- ❌ **ia-every-page-has-slug-or-glob**

## ❌ ia-json-exists

**Command**: `test -f docs/_ia.json && node -e "JSON.parse(require('fs').readFileSync('docs/_ia.json','utf8'))"`
**Exit code**: 1
**Output**:
```
Command failed: test -f docs/_ia.json && node -e "JSON.parse(require('fs').readFileSync('docs/_ia.json','utf8'))"
```

## ❌ ia-has-six-groups

**Command**: `node -e "const ia=require('./docs/_ia.json');const labels=ia.groups.map(g=>g.label);const required=['Getting Started','Examples','Guides','Troubleshooting','Reference','Concepts'];process.exit(required.every(r=>labels.includes(r))?0:1)"`
**Exit code**: 1
**Output**:
```
node:internal/modules/cjs/loader:1386
  throw err;
  ^

Error: Cannot find module './docs/_ia.json'
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
    at [eval]:1:10
    at runScriptInThisContext (node:internal/vm:209:10) {
  code: 'MODULE_NOT_FOUND',
  requireStack: [ '/Users/minh/Documents/converge/[eval]' ]
}

Node.js v22.19.0
```

## ❌ ia-getting-started-has-5-pages

**Command**: `node -e "const ia=require('./docs/_ia.json');const gs=ia.groups.find(g=>g.label==='Getting Started');process.exit(Array.isArray(gs.pages)&&gs.pages.length===5?0:1)"`
**Exit code**: 1
**Output**:
```
node:internal/modules/cjs/loader:1386
  throw err;
  ^

Error: Cannot find module './docs/_ia.json'
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
    at [eval]:1:10
    at runScriptInThisContext (node:internal/vm:209:10) {
  code: 'MODULE_NOT_FOUND',
  requireStack: [ '/Users/minh/Documents/converge/[eval]' ]
}

Node.js v22.19.0
```

## ❌ ia-examples-has-glob

**Command**: `node -e "const ia=require('./docs/_ia.json');const ex=ia.groups.find(g=>g.label==='Examples');const hasGlob=(ex.pages||[]).some(p=>p.kind==='glob'&&String(p.glob||'').startsWith('examples/'));process.exit(hasGlob?0:1)"`
**Exit code**: 1
**Output**:
```
node:internal/modules/cjs/loader:1386
  throw err;
  ^

Error: Cannot find module './docs/_ia.json'
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
    at [eval]:1:10
    at runScriptInThisContext (node:internal/vm:209:10) {
  code: 'MODULE_NOT_FOUND',
  requireStack: [ '/Users/minh/Documents/converge/[eval]' ]
}

Node.js v22.19.0
```

## ❌ ia-troubleshooting-has-glob

**Command**: `node -e "const ia=require('./docs/_ia.json');const t=ia.groups.find(g=>g.label==='Troubleshooting');const hasGlob=(t.pages||[]).some(p=>p.kind==='glob'&&String(p.glob||'').startsWith('troubleshooting/'));process.exit(hasGlob?0:1)"`
**Exit code**: 1
**Output**:
```
node:internal/modules/cjs/loader:1386
  throw err;
  ^

Error: Cannot find module './docs/_ia.json'
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
    at [eval]:1:10
    at runScriptInThisContext (node:internal/vm:209:10) {
  code: 'MODULE_NOT_FOUND',
  requireStack: [ '/Users/minh/Documents/converge/[eval]' ]
}

Node.js v22.19.0
```

## ❌ ia-reference-has-cli-glob

**Command**: `node -e "const ia=require('./docs/_ia.json');const ref=ia.groups.find(g=>g.label==='Reference');const hasCliGlob=(ref.pages||[]).some(p=>p.kind==='glob'&&String(p.glob||'').startsWith('reference/cli/'));process.exit(hasCliGlob?0:1)"`
**Exit code**: 1
**Output**:
```
node:internal/modules/cjs/loader:1386
  throw err;
  ^

Error: Cannot find module './docs/_ia.json'
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
    at [eval]:1:10
    at runScriptInThisContext (node:internal/vm:209:10) {
  code: 'MODULE_NOT_FOUND',
  requireStack: [ '/Users/minh/Documents/converge/[eval]' ]
}

Node.js v22.19.0
```

## ❌ ia-every-page-has-slug-or-glob

**Command**: `node -e "const ia=require('./docs/_ia.json');const allPages=ia.groups.flatMap(g=>g.pages||[]);const ok=allPages.every(p=>p.slug||p.glob);process.exit(ok?0:1)"`
**Exit code**: 1
**Output**:
```
node:internal/modules/cjs/loader:1386
  throw err;
  ^

Error: Cannot find module './docs/_ia.json'
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
    at [eval]:1:10
    at runScriptInThisContext (node:internal/vm:209:10) {
  code: 'MODULE_NOT_FOUND',
  requireStack: [ '/Users/minh/Documents/converge/[eval]' ]
}

Node.js v22.19.0
```
