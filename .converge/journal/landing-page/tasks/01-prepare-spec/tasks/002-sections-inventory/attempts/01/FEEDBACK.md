# FEEDBACK.md — Check Results

**Status**: ❌ 6/6 check(s) failed

- ❌ **sections-json-exists**
- ❌ **sections-json-valid**
- ❌ **sections-count**
- ❌ **sections-have-required-fields**
- ❌ **hero-first**
- ❌ **cta-last**

## ❌ sections-json-exists

**Command**: `test -f apps/landing/.content/sections.json`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/.content/sections.json
```

## ❌ sections-json-valid

**Command**: `test -f apps/landing/.content/sections.json && node -e "JSON.parse(require('fs').readFileSync('apps/landing/.content/sections.json','utf8'))"`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/.content/sections.json && node -e "JSON.parse(require('fs').readFileSync('apps/landing/.content/sections.json','utf8'))"
```

## ❌ sections-count

**Command**: `test -f apps/landing/.content/sections.json && node -e "const r=require('./apps/landing/.content/sections.json');const s=Array.isArray(r)?r:r.sections;process.exit(s.length>=8?0:1)"`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/.content/sections.json && node -e "const r=require('./apps/landing/.content/sections.json');const s=Array.isArray(r)?r:r.sections;process.exit(s.length>=8?0:1)"
```

## ❌ sections-have-required-fields

**Command**: `test -f apps/landing/.content/sections.json && node -e "const r=require('./apps/landing/.content/sections.json');const s=Array.isArray(r)?r:r.sections;const ok=s.every(x=>x.id&&x.title&&x.componentName&&x.intent);process.exit(ok?0:1)"`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/.content/sections.json && node -e "const r=require('./apps/landing/.content/sections.json');const s=Array.isArray(r)?r:r.sections;const ok=s.every(x=>x.id&&x.title&&x.componentName&&x.intent);process.exit(ok?0:1)"
```

## ❌ hero-first

**Command**: `test -f apps/landing/.content/sections.json && node -e "const r=require('./apps/landing/.content/sections.json');const s=Array.isArray(r)?r:r.sections;process.exit(s[0].id==='hero'?0:1)"`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/.content/sections.json && node -e "const r=require('./apps/landing/.content/sections.json');const s=Array.isArray(r)?r:r.sections;process.exit(s[0].id==='hero'?0:1)"
```

## ❌ cta-last

**Command**: `test -f apps/landing/.content/sections.json && node -e "const r=require('./apps/landing/.content/sections.json');const s=Array.isArray(r)?r:r.sections;process.exit(s[s.length-1].id==='cta-banner'?0:1)"`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/.content/sections.json && node -e "const r=require('./apps/landing/.content/sections.json');const s=Array.isArray(r)?r:r.sections;process.exit(s[s.length-1].id==='cta-banner'?0:1)"
```
