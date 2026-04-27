# FEEDBACK.md — Check Results

**Status**: ❌ 4/4 check(s) failed

- ❌ **footer-exists**
- ❌ **footer-has-brand-name**
- ❌ **footer-has-license**
- ❌ **footer-no-screwfast**

## ❌ footer-exists

**Command**: `test -f apps/landing/src/components/layout/Footer.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/components/layout/Footer.astro
```

## ❌ footer-has-brand-name

**Command**: `test -f apps/landing/src/components/layout/Footer.astro && grep -qE 'Converge' apps/landing/src/components/layout/Footer.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/components/layout/Footer.astro && grep -qE 'Converge' apps/landing/src/components/layout/Footer.astro
```

## ❌ footer-has-license

**Command**: `test -f apps/landing/src/components/layout/Footer.astro && grep -qE 'MIT' apps/landing/src/components/layout/Footer.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/components/layout/Footer.astro && grep -qE 'MIT' apps/landing/src/components/layout/Footer.astro
```

## ❌ footer-no-screwfast

**Command**: `test -f apps/landing/src/components/layout/Footer.astro && ! grep -qiE 'screwfast|astrowind|foxi' apps/landing/src/components/layout/Footer.astro`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/src/components/layout/Footer.astro && ! grep -qiE 'screwfast|astrowind|foxi' apps/landing/src/components/layout/Footer.astro
```
