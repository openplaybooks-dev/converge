# FEEDBACK.md — Check Results

**Status**: ❌ 3/3 check(s) failed

- ❌ **redirects-file-exists**
- ❌ **docs-root-redirect**
- ❌ **legacy-redirects-merged**

## ❌ redirects-file-exists

**Command**: `test -f apps/landing/public/_redirects`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/public/_redirects
```

## ❌ docs-root-redirect

**Command**: `test -f apps/landing/public/_redirects && grep -qE '^/docs\s+/docs/getting-started/why-converge' apps/landing/public/_redirects`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/public/_redirects && grep -qE '^/docs\s+/docs/getting-started/why-converge' apps/landing/public/_redirects
```

## ❌ legacy-redirects-merged

**Command**: `test -f apps/landing/public/_redirects && test -f docs/_redirects.json && node -e "const r=require('./docs/_redirects.json').redirects;const f=require('fs').readFileSync('apps/landing/public/_redirects','utf8');const ok=r.every(x=>f.includes(x.from)||f.includes(x.from.replace(/^\/docs\//,'/')));process.exit(ok?0:1)"`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/public/_redirects && test -f docs/_redirects.json && node -e "const r=require('./docs/_redirects.json').redirects;const f=require('fs').readFileSync('apps/landing/public/_redirects','utf8');const ok=r.every(x=>f.includes(x.from)||f.includes(x.from.replace(/^\/docs\//,'/')));process.exit(ok?0:1)"
```
