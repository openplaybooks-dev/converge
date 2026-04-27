# FEEDBACK.md — Check Results

**Status**: ❌ 6/6 check(s) failed

- ❌ **seo-json-exists**
- ❌ **seo-json-valid**
- ❌ **site-fields-present**
- ❌ **home-route-meta**
- ❌ **docs-route-meta**
- ❌ **blog-route-meta**

## ❌ seo-json-exists

**Command**: `test -f apps/landing/.content/seo.json`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/.content/seo.json
```

## ❌ seo-json-valid

**Command**: `test -f apps/landing/.content/seo.json && node -e "JSON.parse(require('fs').readFileSync('apps/landing/.content/seo.json','utf8'))"`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/.content/seo.json && node -e "JSON.parse(require('fs').readFileSync('apps/landing/.content/seo.json','utf8'))"
```

## ❌ site-fields-present

**Command**: `test -f apps/landing/.content/seo.json && node -e "const s=require('./apps/landing/.content/seo.json').site;['title','description','ogImage','canonical','locale'].forEach(k=>{if(!s[k])process.exit(1)});process.exit(0)"`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/.content/seo.json && node -e "const s=require('./apps/landing/.content/seo.json').site;['title','description','ogImage','canonical','locale'].forEach(k=>{if(!s[k])process.exit(1)});process.exit(0)"
```

## ❌ home-route-meta

**Command**: `test -f apps/landing/.content/seo.json && node -e "process.exit(require('./apps/landing/.content/seo.json').pages?.home ? 0 : 1)"`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/.content/seo.json && node -e "process.exit(require('./apps/landing/.content/seo.json').pages?.home ? 0 : 1)"
```

## ❌ docs-route-meta

**Command**: `test -f apps/landing/.content/seo.json && node -e "process.exit(require('./apps/landing/.content/seo.json').pages?.docs ? 0 : 1)"`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/.content/seo.json && node -e "process.exit(require('./apps/landing/.content/seo.json').pages?.docs ? 0 : 1)"
```

## ❌ blog-route-meta

**Command**: `test -f apps/landing/.content/seo.json && node -e "process.exit(require('./apps/landing/.content/seo.json').pages?.blog ? 0 : 1)"`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/.content/seo.json && node -e "process.exit(require('./apps/landing/.content/seo.json').pages?.blog ? 0 : 1)"
```
