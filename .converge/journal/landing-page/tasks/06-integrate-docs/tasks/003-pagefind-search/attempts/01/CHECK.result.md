# RESULT.md — Attempt 1

**Outcome**: ❌ FAILED
**Duration**: 6m 6s
**Completed**: 2026-04-26T19:46:14.548Z

## Outputs

- `apps/landing/astro.config.mjs` — ✓ produced (1.3 KB)

## Check Results — ❌ some failed

- ✓ **pagefind-enabled**: pagefind is enabled in starlight config
- ✗ **pagefind-built**: dist/pagefind directory was created by the build

## Failed Check Details

### pagefind-built — ❌ FAILED
**Command**: `test -f apps/landing/package.json && pnpm --filter @converge/landing build && test -d apps/landing/dist/pagefind`
**Exit code**: 1
**Output**:
```
packages/studio                          |  WARN  The field "pnpm.onlyBuiltDependencies" was found in /Users/minh/Documents/converge/packages/studio/package.json. This will not take effect. You should configure "pnpm.onlyBuiltDependencies" at the root of the workspace instead.

> @converge/landing@0.0.0 build /Users/minh/Documents/converge/apps/landing
> astro build

02:46:10 [@astrojs/cloudflare] Enabling image processing with Cloudflare Images for production with the "IMAGES" Images binding.
02:46:10 [@astrojs/cloudflare] Enabling sessions with Cloudflare KV with the "SESSION" KV binding.
02:46:10 [WARN] [router] The route "/404" is defined in both "src/pages/404.astro" and "../../node_modules/@astrojs/starlight/routes/static/404.astro". A static route cannot be defined more than once.
02:46:10 [WARN] [router] A collision will result in a hard error in following versions of Astro.
02:46:10 [WARN] [router] The route "/404" is defined in both "src/pages/404.astro" and "../../node_modules/@astrojs/starlight/routes/static/404.astro". A static route cannot be defined more than once.
02:46:10 [WARN] [router] A collision will result in a hard error in following versions of Astro.
02:46:10 [WARN] [vite] Default inspector port 9229 not available, using 9230 instead

02:46:11 [content] Syncing content
02:46:11 [WARN] [starlight-docs-loader] The base directory "/Users/minh/Documents/converge/apps/landing/src/content/docs/" does not exist.
02:46:11 [content] Synced content
02:46:11 [types] Generated 1.18s
02:46:11 [build] output: "server"
02:46:11 [build] mode: "server"
02:46:11 [build] directory: /Users/minh/Documents/converge/apps/landing/dist/
02:46:11 [build] adapter: @astrojs/cloudflare
02:46:11 [build] Collecting build info...
02:46:11 [build] ✓ Completed in 1.21s.
02:46:11 [build] Building server entrypoints...
02:46:13 [vite] ✓ built in 1.73s
02:46:13 [astro-icon] Loaded icons from src/icons, lucide
02:46:14 [vite] ✓ built in 882ms
02:46:14 [vite] ✓ built in 101ms

 prerendering static routes 
02:46:14   ├─ /404.html (+16ms) 
02:46:14 ✓ Completed in 253ms.

02:46:14 [build] Rearranging server assets...
02:46:14 [build] ✓ Completed in 3.02s.
02:46:14 [@astrojs/sitemap] `sitemap-index.xml` created at `dist/client`
02:46:14 [starlight:pagefind] Building search index with Pagefind...
02:46:14 [starlight:pagefind] Found 1 HTML files.
02:46:14 [starlight:pagefind] Finished building search index in 10ms.
02:46:14 [build] Server built in 4.25s
02:46:14 [build] Complete!
Default inspector port 9229 not available, using 9231 instead

The collection "docs" does not exist or is empty. Please check your content config file for errors.
```
