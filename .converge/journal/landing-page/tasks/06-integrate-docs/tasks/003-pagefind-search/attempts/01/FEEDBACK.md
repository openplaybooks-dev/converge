# FEEDBACK.md — Check Results

**Status**: ❌ 1/2 check(s) failed

- ✅ **pagefind-enabled**
- ❌ **pagefind-built**

## ❌ pagefind-built

**Command**: `test -f apps/landing/package.json && pnpm --filter @converge/landing build && test -d apps/landing/dist/pagefind`
**Exit code**: 1
**Output**:
```
02:40:07 [ERROR] [@astrojs/starlight] An unhandled error occurred while running the "astro:config:setup" hook
[AstroUserError] Invalid config passed to starlight integration
  Hint:
    Starlight v0.33.0 changed the `social` configuration syntax. Please specify an array of link items instead of an object.
    See the Starlight changelog for details: https://github.com/withastro/starlight/blob/main/packages/starlight/CHANGELOG.md#0330
    
    sidebar.1.items.1: Did not match union.
    > Expected type `{ label: string; link: string } | { label: string; items: array } | { label: string; autogenerate: object } | { slug: string } | string`
    > Received `{}`
    sidebar.3.items.1: Did not match union.
    > Expected type `{ label: string; link: string } | { label: string; items: array } | { label: string; autogenerate: object } | { slug: string } | string`
    > Received `{}`
    sidebar.4.items.0: Did not match union.
    > Expected type `{ label: string; link: string } | { label: string; items: array } | { label: string; autogenerate: object } | { slug: string } | string`
    > Received `{}`
  Location:
    /Users/minh/Documents/converge/node_modules/@astrojs/starlight/utils/error-map.ts:24:11
  Stack trace:
    at processParsedData (/Users/minh/Documents/converge/node_modules/@astrojs/starlight/utils/error-map.ts:24:11)
    at runPlugins (/Users/minh/Documents/converge/node_modules/@astrojs/starlight/utils/plugins.ts:21:74)
    at hookFn (file:///Users/minh/Documents/converge/node_modules/astro/dist/integrations/hooks.js:55:21)
    at runHookInternal (file:///Users/minh/Documents/converge/node_modules/astro/dist/integrations/hooks.js:52:11)
    at async AstroBuilder.setup (file:///Users/minh/Documents/converge/node_modules/astro/dist/core/build/index.js:76:21)
packages/studio                          |  WARN  The field "pnpm.onlyBuiltDependencies" was found in /Users/minh/Documents/converge/packages/studio/package.json. This will not take effect. You should configure "pnpm.onlyBuiltDependencies" at the root of the workspace instead.

> @converge/landing@0.0.0 build /Users/minh/Documents/converge/apps/landing
> astro build

02:40:07 [@astrojs/cloudflare] Enabling image processing with Cloudflare Images for production with the "IMAGES" Images binding.
02:40:07 [@astrojs/cloudflare] Enabling sessions with Cloudflare KV with the "SESSION" KV binding.
/Users/minh/Documents/converge/apps/landing:
 ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL  @converge/landing@0.0.0 build: `astro build`
Exit status 1
```
