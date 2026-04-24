# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **lint-report-exists**
- ❌ **lint-passes**

## ❌ lint-report-exists

**Command**: `test -f .converge/standardize-state/quality/lint-report.json`
**Exit code**: 1
**Output**:
```
Command failed: test -f .converge/standardize-state/quality/lint-report.json
```

## ❌ lint-passes

**Command**: `node -e "const r=JSON.parse(require('fs').readFileSync('.converge/standardize-state/quality/lint-report.json','utf-8'));if(r.errors>0)throw new Error(r.errors+' lint errors')"`
**Exit code**: 1
**Output**:
```
node:fs:441
    return binding.readFileUtf8(path, stringToFlags(options.flag));
                   ^

Error: ENOENT: no such file or directory, open '.converge/standardize-state/quality/lint-report.json'
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
  path: '.converge/standardize-state/quality/lint-report.json'
}

Node.js v22.19.0
```
