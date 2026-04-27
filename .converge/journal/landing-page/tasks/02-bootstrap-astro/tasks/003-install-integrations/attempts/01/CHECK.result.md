# RESULT.md — Attempt 1

**Outcome**: ❌ FAILED
**Duration**: 4m 39s
**Completed**: 2026-04-26T17:32:17.592Z

## Outputs

- `apps/landing/package.json` — ✓ produced (1.7 KB)

## Check Results — ❌ some failed

- ✓ **tailwind-installed**: tailwindcss (any of the 3 install styles) is in deps
- ✓ **mdx-installed**: @astrojs/mdx is in deps
- ✓ **sitemap-installed**: @astrojs/sitemap is in deps
- ✓ **rss-installed**: @astrojs/rss is in deps
- ✓ **starlight-installed**: @astrojs/starlight is in deps
- ✓ **cloudflare-adapter-installed**: @astrojs/cloudflare is in deps
- ✗ **install-completed**: pnpm install completed and astro is resolvable

## Failed Check Details

### install-completed — ❌ FAILED
**Command**: `test -f apps/landing/package.json && test -d apps/landing/node_modules && test -d apps/landing/node_modules/astro`
**Exit code**: 1
**Output**: *(none)*
