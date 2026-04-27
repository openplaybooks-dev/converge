# FEEDBACK.md — Check Results

**Status**: ❌ 2/4 check(s) failed

- ❌ **meta-validation**
- ✅ **sitemap-exists**
- ❌ **robots-exists**
- ✅ **og-default-shipped**

## ❌ meta-validation

**Command**: `node .converge/playbooks/landing-page/scripts/check-meta-validation.mjs`
**Exit code**: 1
**Output**:
```
check-meta-validation: missing or empty meta tags:
  ✗ title (got: "Welcome to Astro")
ok html-lang: en
  ok meta-description: Open-source TypeScript framework for AI workflows. Goal-driv…
  ok canonical: https://converge.dev/
  ok og-title: Welcome to Astro
  ok og-description: Open-source TypeScript framework for AI workflows. Goal-driv…
  ok og-image: https://converge.dev/og/home.png
  ok twitter-card: summary_large_image
```

## ❌ robots-exists

**Command**: `test -f apps/landing/dist/robots.txt`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/dist/robots.txt
```
