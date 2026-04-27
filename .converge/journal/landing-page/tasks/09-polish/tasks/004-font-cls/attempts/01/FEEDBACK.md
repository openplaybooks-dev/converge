# FEEDBACK.md — Check Results

**Status**: ❌ 1/2 check(s) failed

- ❌ **typography-uses-font-display**
- ✅ **has-fallback-font**

## ❌ typography-uses-font-display

**Command**: `test -f apps/landing/src/styles/typography.css && grep -qE 'font-display\s*:\s*(swap|optional|fallback)' apps/landing/src/styles/typography.css`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/styles/typography.css && grep -qE 'font-display\s*:\s*(swap|optional|fallback)' apps/landing/src/styles/typography.css
```
