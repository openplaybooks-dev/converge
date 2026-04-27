# Task: 10-verify/008-meta-validation

# Meta validation

Run the meta-validation script + verify the static SEO files exist.

```bash
node .converge/playbooks/landing-page/scripts/check-meta-validation.mjs
```

The script asserts:
- `<html lang="...">` (non-empty)
- `<title>` (non-empty, NOT "Astro" or any forked-theme name)
- `<meta name="description" content="...">` (non-empty)
- `<link rel="canonical" href="...">` (non-empty)
- `<meta property="og:title">`, `og:description`, `og:image` (all non-empty)
- `<meta name="twitter:card" content="...">` (any value)

Plus this task verifies:
- `dist/sitemap.xml` (or `sitemap-index.xml`) exists — emitted by `@astrojs/sitemap`
- `dist/robots.txt` exists — written by phase 11 or by Astro static
- `dist/og/default.png` (or `dist/og.png`) exists — from phase 08

If any of these is missing, fix the responsible upstream task and re-build.