# FEEDBACK.md — Check Results

**Status**: ❌ 3/5 check(s) failed

- ✅ **fontsource-inter-installed**
- ✅ **fontsource-jetbrains-installed**
- ❌ **typography-css-exists**
- ❌ **typography-imports-fonts**
- ❌ **globals-imports-typography**

## ❌ typography-css-exists

**Command**: `test -f apps/landing/src/styles/typography.css`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/styles/typography.css
```

## ❌ typography-imports-fonts

**Command**: `test -f apps/landing/src/styles/typography.css && grep -qE 'fontsource|@import.*inter' apps/landing/src/styles/typography.css`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/styles/typography.css && grep -qE 'fontsource|@import.*inter' apps/landing/src/styles/typography.css
```

## ❌ globals-imports-typography

**Command**: `test -f apps/landing/src/styles/globals.css && grep -q 'typography.css' apps/landing/src/styles/globals.css`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/styles/globals.css && grep -q 'typography.css' apps/landing/src/styles/globals.css
```
