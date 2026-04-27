# FEEDBACK.md — Check Results

**Status**: ❌ 1/1 check(s) failed

- ❌ **pagefind-built**

## ❌ pagefind-built

**Command**: `test -f apps/landing/package.json && pnpm --filter @converge/landing build && test -d apps/landing/dist/pagefind`
**Exit code**: 1
**Output**:
```
Default inspector port 9229 not available, using 9231 instead

The collection "docs" does not exist or is empty. Please check your content config file for errors.
packages/studio                          |  WARN  The field "pnpm.onlyBuiltDependencies" was found in /Users/minh/Documents/converge/packages/studio/package.json. This will not take effect. You should configure "pnpm.onlyBuiltDependencies" at the root of the workspace instead.

> @converge/landing@0.0.0 build /Users/minh/Documents/converge/apps/landing
> astro build

02:45:27 [@astrojs/cloudflare] Enabling image processing with Cloudflare Images for production with the "IMAGES" Images binding.
02:45:27 [@astrojs/cloudflare] Enabling sessions with Cloudflare KV with the "SESSION" KV binding.
02:45:27 [WARN] [router] The route "/404" is defined in both "src/pages/404.astro" and "../../node_modules/@astrojs/starlight/routes/static/404.astro". A static route cannot be defined more than once.
02:45:27 [WARN] [router] A collision will result in a hard error in following versions of Astro.
02:45:27 [WARN] [router] The route "/404" is defined in both "src/pages/404.astro" and "../../node_modules/@astrojs/starlight/routes/static/404.astro". A static route cannot be defined more than once.
02:45:27 [WARN] [router] A collision will result in a hard error in following versions of Astro.
02:45:27 [WARN] [vite] Default inspector port 9229 not available, using 9230 instead

02:45:28 [content] Syncing content
02:45:28 [WARN] [starlight-docs-loader] The base directory "/Users/minh/Documents/converge/apps/landing/src/content/docs/" does not exist.
02:45:28 [content] Synced content
02:45:28 [types] Generated 1.15s
02:45:28 [build] output: "server"
02:45:28 [build] mode: "server"
02:45:28 [build] directory: /Users/minh/Documents/converge/apps/landing/dist/
02:45:28 [build] adapter: @astrojs/cloudflare
02:45:28 [build] Collecting build info...
02:45:28 [build] ✓ Completed in 1.18s.
02:45:28 [build] Building server entrypoints...
02:45:30 [vite] ✓ built in 1.71s
02:45:31 [astro-icon] Loaded icons from src/icons, lucide
02:45:31 [vite] ✓ built in 780ms
02:45:31 [vite] ✓ built in 102ms

 prerendering static routes 
02:45:31   ├─ /404.html (+17ms) 
02:45:31 ✓ Completed in 278ms.

02:45:31 [build] Rearranging server assets...
02:45:31 [build] ✓ Completed in 2.92s.
02:45:31 [@astrojs/sitemap] `sitemap-index.xml` created at `dist/client`
02:45:31 [starlight:pagefind] Building search index with Pagefind...
02:45:31 [starlight:pagefind] Found 1 HTML files.
02:45:31 [starlight:pagefind] Finished building search index in 11ms.
02:45:31 [build] Server built in 4.12s
02:45:31 [build] Complete!
```
