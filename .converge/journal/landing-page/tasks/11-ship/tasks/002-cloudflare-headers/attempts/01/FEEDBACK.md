# FEEDBACK.md — Check Results

**Status**: ❌ 3/3 check(s) failed

- ❌ **headers-exists**
- ❌ **has-csp**
- ❌ **has-cache-control**

## ❌ headers-exists

**Command**: `test -f apps/landing/public/_headers`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/public/_headers
```

## ❌ has-csp

**Command**: `test -f apps/landing/public/_headers && grep -qE 'Content-Security-Policy|X-Frame-Options' apps/landing/public/_headers`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/public/_headers && grep -qE 'Content-Security-Policy|X-Frame-Options' apps/landing/public/_headers
```

## ❌ has-cache-control

**Command**: `test -f apps/landing/public/_headers && grep -qE 'Cache-Control' apps/landing/public/_headers`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/public/_headers && grep -qE 'Cache-Control' apps/landing/public/_headers
```
