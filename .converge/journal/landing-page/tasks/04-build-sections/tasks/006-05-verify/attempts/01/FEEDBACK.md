# FEEDBACK.md — Check Results

**Status**: ❌ 3/4 check(s) failed

- ✅ **build-succeeds**
- ❌ **rendered-output-exists**
- ❌ **section-id-rendered**
- ❌ **passed-marker**

## ❌ rendered-output-exists

**Command**: `test -f apps/landing/dist/index.html`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/dist/index.html
```

## ❌ section-id-rendered

**Command**: `test -f apps/landing/dist/index.html && grep -qE 'id="quickstart"' apps/landing/dist/index.html`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/dist/index.html && grep -qE 'id="quickstart"' apps/landing/dist/index.html
```

## ❌ passed-marker

**Command**: `test -f apps/landing/.content/sections/quickstart/PASSED`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/.content/sections/quickstart/PASSED
```
