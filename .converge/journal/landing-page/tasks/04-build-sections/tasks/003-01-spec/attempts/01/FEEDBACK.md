# FEEDBACK.md — Check Results

**Status**: ❌ 3/3 check(s) failed

- ❌ **spec-md-exists**
- ❌ **spec-has-content**
- ❌ **spec-references-brand**

## ❌ spec-md-exists

**Command**: `test -f apps/landing/.content/sections/problem-solution/SPEC.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/.content/sections/problem-solution/SPEC.md
```

## ❌ spec-has-content

**Command**: `test -f apps/landing/.content/sections/problem-solution/SPEC.md && test $(wc -l < apps/landing/.content/sections/problem-solution/SPEC.md) -ge 40`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/.content/sections/problem-solution/SPEC.md && test $(wc -l < apps/landing/.content/sections/problem-solution/SPEC.md) -ge 40
```

## ❌ spec-references-brand

**Command**: `test -f apps/landing/.content/sections/problem-solution/SPEC.md && grep -qE '(palette|tagline|brand|tokens)' apps/landing/.content/sections/problem-solution/SPEC.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/.content/sections/problem-solution/SPEC.md && grep -qE '(palette|tagline|brand|tokens)' apps/landing/.content/sections/problem-solution/SPEC.md
```
