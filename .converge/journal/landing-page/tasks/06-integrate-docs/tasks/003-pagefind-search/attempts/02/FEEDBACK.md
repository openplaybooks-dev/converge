# FEEDBACK.md — Check Results

**Status**: ❌ 1/2 check(s) failed

- ✅ **pagefind-enabled**
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

02:46:29 [@astrojs/cloudflare] Enabling image processing with Cloudflare Images for production with the "IMAGES" Images binding.
02:46:29 [@astrojs/cloudflare] Enabling sessions with Cloudflare KV with the "SESSION" KV binding.
02:46:29 [WARN] [router] The route "/404" is defined in both "src/pages/404.astro" and "../../node_modules/@astrojs/starlight/routes/static/404.astro". A static route cannot be defined more than once.
02:46:29 [WARN] [router] A collision will result in a hard error in following versions of Astro.
02:46:29 [WARN] [router] The route "/404" is defined in both "src/pages/404.astro" and "../../node_modules/@astrojs/starlight/routes/static/404.astro". A static route cannot be defined more than once.
02:46:29 [WARN] [router] A collision will result in a hard error in following versions of Astro.
02:46:29 [WARN] [vite] Default inspector port 9229 not available, using 9230 instead

02:46:30 [content] Syncing content
02:46:30 [WARN] [starlight-docs-loader] The base directory "/Users/minh/Documents/converge/apps/landing/src/content/docs/" does not exist.
02:46:30 [content] Synced content
02:46:30 [types] Generated 1.21s
02:46:30 [build] output: "server"
02:46:30 [build] mode: "server"
02:46:30 [build] directory: /Users/minh/Documents/converge/apps/landing/dist/
02:46:30 [build] adapter: @astrojs/cloudflare
02:46:30 [build] Collecting build info...
02:46:30 [build] ✓ Completed in 1.24s.
02:46:30 [build] Building server entrypoints...
02:46:32 [vite] ✓ built in 1.74s
02:46:32 [astro-icon] Loaded icons from src/icons, lucide
02:46:33 [vite] ✓ built in 837ms
02:46:33 [vite] ✓ built in 99ms

 prerendering static routes 
02:46:33   ├─ /404.html (+17ms) 
02:46:33 ✓ Completed in 252ms.

02:46:33 [build] Rearranging server assets...
02:46:33 [build] ✓ Completed in 2.98s.
02:46:33 [@astrojs/sitemap] `sitemap-index.xml` created at `dist/client`
02:46:33 [starlight:pagefind] Building search index with Pagefind...
02:46:33 [starlight:pagefind] Found 1 HTML files.
02:46:33 [starlight:pagefind] Finished building search index in 11ms.
02:46:33 [build] Server built in 4.23s
02:46:33 [build] Complete!
```
