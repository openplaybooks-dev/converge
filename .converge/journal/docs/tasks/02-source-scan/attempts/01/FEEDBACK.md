# FEEDBACK.md — Check Results

**Status**: ❌ 7/7 check(s) failed

- ❌ **sources-json-exists**
- ❌ **sources-json-has-cli**
- ❌ **sources-json-has-core**
- ❌ **sources-json-has-troubleshooting**
- ❌ **cli-commands-extracted**
- ❌ **examples-manifest-exists**
- ❌ **examples-have-required-fields**

## ❌ sources-json-exists

**Command**: `test -f docs/_sources.json && node -e "JSON.parse(require('fs').readFileSync('docs/_sources.json','utf8'))"`
**Exit code**: 1
**Output**:
```
Command failed: test -f docs/_sources.json && node -e "JSON.parse(require('fs').readFileSync('docs/_sources.json','utf8'))"
```

## ❌ sources-json-has-cli

**Command**: `node -e "const s=require('./docs/_sources.json');process.exit(Array.isArray(s.cli)&&s.cli.length>0?0:1)"`
**Exit code**: 1
**Output**:
```
node:internal/modules/cjs/loader:1386
  throw err;
  ^

Error: Cannot find module './docs/_sources.json'
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

## ❌ sources-json-has-core

**Command**: `node -e "const s=require('./docs/_sources.json');process.exit(Array.isArray(s.core)&&s.core.length>0?0:1)"`
**Exit code**: 1
**Output**:
```
node:internal/modules/cjs/loader:1386
  throw err;
  ^

Error: Cannot find module './docs/_sources.json'
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

## ❌ sources-json-has-troubleshooting

**Command**: `node -e "const s=require('./docs/_sources.json');process.exit(Array.isArray(s.troubleshooting)&&s.troubleshooting.length>0?0:1)"`
**Exit code**: 1
**Output**:
```
node:internal/modules/cjs/loader:1386
  throw err;
  ^

Error: Cannot find module './docs/_sources.json'
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

## ❌ cli-commands-extracted

**Command**: `test -f docs/_cli-commands.json && node -e "const c=require('./docs/_cli-commands.json');process.exit(c.length>=10?0:1)"`
**Exit code**: 1
**Output**:
```
Command failed: test -f docs/_cli-commands.json && node -e "const c=require('./docs/_cli-commands.json');process.exit(c.length>=10?0:1)"
```

## ❌ examples-manifest-exists

**Command**: `test -f docs/_examples.json && node -e "const e=JSON.parse(require('fs').readFileSync('docs/_examples.json','utf8'));process.exit(Array.isArray(e)&&e.length>=15?0:1)"`
**Exit code**: 1
**Output**:
```
Command failed: test -f docs/_examples.json && node -e "const e=JSON.parse(require('fs').readFileSync('docs/_examples.json','utf8'));process.exit(Array.isArray(e)&&e.length>=15?0:1)"
```

## ❌ examples-have-required-fields

**Command**: `node -e "const e=JSON.parse(require('fs').readFileSync('./docs/_examples.json','utf8'));const ok=e.every(x=>x.slug&&x.category&&typeof x.hasReadme==='boolean'&&typeof x.hasPlaybook==='boolean');process.exit(ok?0:1)"`
**Exit code**: 1
**Output**:
```
node:fs:441
    return binding.readFileUtf8(path, stringToFlags(options.flag));
                   ^

Error: ENOENT: no such file or directory, open './docs/_examples.json'
    at Object.readFileSync (node:fs:441:20)
    at [eval]:1:34
    at runScriptInThisContext (node:internal/vm:209:10)
    at node:internal/process/execution:446:12
    at [eval]-wrapper:6:24
    at runScriptInContext (node:internal/process/execution:444:60)
    at evalFunction (node:internal/process/execution:279:30)
    at evalTypeScript (node:internal/process/execution:291:3)
    at node:internal/main/eval_string:74:3 {
  errno: -2,
  code: 'ENOENT',
  syscall: 'open',
  path: './docs/_examples.json'
}

Node.js v22.19.0
```
