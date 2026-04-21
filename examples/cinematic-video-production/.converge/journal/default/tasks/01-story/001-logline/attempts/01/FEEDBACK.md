# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **logline-exists**
- ❌ **logline-one-sentence**

## ❌ logline-exists

**Command**: `test -s logline.md`
**Exit code**: 1
**Output**:
```
Command failed: test -s logline.md
```

## ❌ logline-one-sentence

**Command**: `node -e "const L=require('fs').readFileSync('logline.md','utf8').split(/\r?\n/).filter(l=>l.trim()&&!l.startsWith('#')).length;if(L>2){process.exit(1)}"`
**Exit code**: 1
**Output**:
```
node:fs:441
    return binding.readFileUtf8(path, stringToFlags(options.flag));
                   ^

Error: ENOENT: no such file or directory, open 'D:\converge\examples\cinematic-video-production\logline.md'
    at Object.readFileSync (node:fs:441:20)
    at [eval]:1:23
    at runScriptInThisContext (node:internal/vm:209:10)
    at node:internal/process/execution:449:12
    at [eval]-wrapper:6:24
    at runScriptInContext (node:internal/process/execution:447:60)
    at evalFunction (node:internal/process/execution:87:30)
    at evalScript (node:internal/process/execution:99:3)
    at node:internal/main/eval_string:74:3 {
  errno: -4058,
  code: 'ENOENT',
  syscall: 'open',
  path: 'D:\\converge\\examples\\cinematic-video-production\\logline.md'
}

Node.js v22.17.1
```
