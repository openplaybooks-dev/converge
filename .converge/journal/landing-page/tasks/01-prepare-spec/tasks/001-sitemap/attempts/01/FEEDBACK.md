# FEEDBACK.md — Check Results

**Status**: ❌ 4/4 check(s) failed

- ❌ **sitemap-json-exists**
- ❌ **sitemap-valid-json**
- ❌ **includes-home-and-docs**
- ❌ **includes-blog**

## ❌ sitemap-json-exists

**Command**: `test -f apps/landing/.content/sitemap.json`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/.content/sitemap.json
```

## ❌ sitemap-valid-json

**Command**: `test -f apps/landing/.content/sitemap.json && node -e "JSON.parse(require('fs').readFileSync('apps/landing/.content/sitemap.json','utf8'))"`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/.content/sitemap.json && node -e "JSON.parse(require('fs').readFileSync('apps/landing/.content/sitemap.json','utf8'))"
```

## ❌ includes-home-and-docs

**Command**: `test -f apps/landing/.content/sitemap.json && node -e "const r=require('./apps/landing/.content/sitemap.json');const routes=r.routes||r;const set=new Set(routes.map(x=>x.path||x));process.exit(set.has('/') && [...set].some(p=>p.startsWith('/docs/')) ? 0 : 1)"`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/.content/sitemap.json && node -e "const r=require('./apps/landing/.content/sitemap.json');const routes=r.routes||r;const set=new Set(routes.map(x=>x.path||x));process.exit(set.has('/') && [...set].some(p=>p.startsWith('/docs/')) ? 0 : 1)"
```

## ❌ includes-blog

**Command**: `test -f apps/landing/.content/sitemap.json && node -e "const r=require('./apps/landing/.content/sitemap.json');const routes=r.routes||r;process.exit(routes.some(x=>(x.path||x)==='/blog') ? 0 : 1)"`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/.content/sitemap.json && node -e "const r=require('./apps/landing/.content/sitemap.json');const routes=r.routes||r;process.exit(routes.some(x=>(x.path||x)==='/blog') ? 0 : 1)"
```
