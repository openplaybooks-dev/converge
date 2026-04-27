# FEEDBACK.md — Check Results

**Status**: ❌ 4/4 check(s) failed

- ❌ **build-succeeds**
- ❌ **rendered-output-exists**
- ❌ **section-id-rendered**
- ❌ **passed-marker**

## ❌ build-succeeds

**Command**: `test -f apps/landing/package.json && pnpm --filter @converge/landing build`
**Exit code**: 1
**Output**:
```
01:18:24 [ERROR] [vite] ✗ Build failed in 412ms
[vite]: Rollup failed to resolve import "virtual:astro-icon" from "/Users/minh/Documents/converge/node_modules/astro-icon/components/Icon.astro".
This is most likely unintended because it can break your application at runtime.
If you do want to externalize this module explicitly add it to
`build.rollupOptions.external`
  Stack trace:
    at viteLog (file:///Users/minh/Documents/converge/node_modules/astro/node_modules/vite/dist/node/chunks/config.js:33639:57)
    at onLog (file:///Users/minh/Documents/converge/node_modules/astro/node_modules/vite/dist/node/chunks/config.js:33471:4)
    at Object.logger [as onLog] (file:///Users/minh/Documents/converge/node_modules/rollup/dist/es/shared/node-entry.js:23364:9)
    at file:///Users/minh/Documents/converge/node_modules/rollup/dist/es/shared/node-entry.js:22066:26
packages/studio                          |  WARN  The field "pnpm.onlyBuiltDependencies" was found in /Users/minh/Documents/converge/packages/studio/package.json. This will not take effect. You should configure "pnpm.onlyBuiltDependencies" at the root of the workspace instead.

> @converge/landing@0.0.0 build /Users/minh/Documents/converge/apps/landing
> astro build

01:18:22 [@astrojs/cloudflare] Enabling image processing with Cloudflare Images for production with the "IMAGES" Images binding.
01:18:22 [@astrojs/cloudflare] Enabling sessions with Cloudflare KV with the "SESSION" KV binding.
01:18:23 [types] Generated 841ms
01:18:23 [build] output: "static"
01:18:23 [build] mode: "server"
01:18:23 [build] directory: /Users/minh/Documents/converge/apps/landing/dist/
01:18:23 [build] adapter: @astrojs/cloudflare
01:18:23 [build] Collecting build info...
01:18:23 [build] ✓ Completed in 858ms.
01:18:23 [build] Building server entrypoints...
/Users/minh/Documents/converge/apps/landing:
 ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL  @converge/landing@0.0.0 build: `astro build`
Exit status 1
```

## ❌ rendered-output-exists

**Command**: `test -f apps/landing/dist/index.html`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/dist/index.html
```

## ❌ section-id-rendered

**Command**: `test -f apps/landing/dist/index.html && grep -qE 'id="feature-grid"' apps/landing/dist/index.html`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/dist/index.html && grep -qE 'id="feature-grid"' apps/landing/dist/index.html
```

## ❌ passed-marker

**Command**: `test -f apps/landing/.content/sections/feature-grid/PASSED`
**Exit code**: 1
**Output**:
```
Command failed: test -f apps/landing/.content/sections/feature-grid/PASSED
```
