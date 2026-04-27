# FEEDBACK.md — Check Results

**Status**: ❌ 1/1 check(s) failed

- ❌ **smoke-passes**

## ❌ smoke-passes

**Command**: `test -f .converge/studio-state/dev-smoke.json && node -e "const r=JSON.parse(require('fs').readFileSync('.converge/studio-state/dev-smoke.json','utf8'));process.exit(r.rootRedirectsToPlaybooks===true&&r.playbooksIndexHas200===true?0:1)"`
**Exit code**: 1
**Output**:
```
Command failed: test -f .converge/studio-state/dev-smoke.json && node -e "const r=JSON.parse(require('fs').readFileSync('.converge/studio-state/dev-smoke.json','utf8'));process.exit(r.rootRedirectsToPlaybooks===true&&r.playbooksIndexHas200===true?0:1)"
```
