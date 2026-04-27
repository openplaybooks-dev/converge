# FEEDBACK.md — Check Results

**Status**: ❌ 1/1 check(s) failed

- ❌ **build-succeeded**

## ❌ build-succeeded

**Command**: `test -f .converge/studio-state/final-build.json && node -e "const r=JSON.parse(require('fs').readFileSync('.converge/studio-state/final-build.json','utf8'));process.exit(r.exitCode===0?0:1)"`
**Exit code**: 1
**Output**:
```
Command failed: test -f .converge/studio-state/final-build.json && node -e "const r=JSON.parse(require('fs').readFileSync('.converge/studio-state/final-build.json','utf8'));process.exit(r.exitCode===0?0:1)"
```
