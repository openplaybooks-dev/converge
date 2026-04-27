# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **rss-route-exists**
- ❌ **rss-uses-astrojs-rss**

## ❌ rss-route-exists

**Command**: `test -f apps/landing/src/pages/rss.xml.ts`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/pages/rss.xml.ts
```

## ❌ rss-uses-astrojs-rss

**Command**: `test -f apps/landing/src/pages/rss.xml.ts && grep -qE '@astrojs/rss' apps/landing/src/pages/rss.xml.ts`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/pages/rss.xml.ts && grep -qE '@astrojs/rss' apps/landing/src/pages/rss.xml.ts
```
