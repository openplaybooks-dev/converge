# FEEDBACK.md — Check Results

**Status**: ❌ 4/4 check(s) failed

- ❌ **manifest-exists**
- ❌ **manifest-has-screens**
- ❌ **manifest-has-elements**
- ❌ **every-element-has-id**

## ❌ manifest-exists

**Command**: `test -f navigations.json`
**Exit code**: 1
**Output**:
```
Command failed: test -f navigations.json
```

## ❌ manifest-has-screens

**Command**: `node -e "const n=JSON.parse(require('fs').readFileSync('navigations.json','utf-8')); process.exit(n.screens && n.screens.length >= 5 ? 0 : 1)"`
**Exit code**: 1
**Output**:
```
node:fs:441
    return binding.readFileUtf8(path, stringToFlags(options.flag));
                   ^

Error: ENOENT: no such file or directory, open 'navigations.json'
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
  path: 'navigations.json'
}

Node.js v22.19.0
```

## ❌ manifest-has-elements

**Command**: `node -e "const n=JSON.parse(require('fs').readFileSync('navigations.json','utf-8')); const total=n.screens.reduce((s,sc)=>s+sc.elements.length,0); process.exit(total >= 10 ? 0 : 1)"`
**Exit code**: 1
**Output**:
```
node:fs:441
    return binding.readFileUtf8(path, stringToFlags(options.flag));
                   ^

Error: ENOENT: no such file or directory, open 'navigations.json'
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
  path: 'navigations.json'
}

Node.js v22.19.0
```

## ❌ every-element-has-id

**Command**: `node -e "const n=JSON.parse(require('fs').readFileSync('navigations.json','utf-8')); const ok=n.screens.every(s=>s.elements.every(e=>e.elementId)); process.exit(ok ? 0 : 1)"`
**Exit code**: 1
**Output**:
```
node:fs:441
    return binding.readFileUtf8(path, stringToFlags(options.flag));
                   ^

Error: ENOENT: no such file or directory, open 'navigations.json'
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
  path: 'navigations.json'
}

Node.js v22.19.0
```
