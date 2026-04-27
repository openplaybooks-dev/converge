# Checks: 05-build-layout/004-head-seo

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## head-exists
**Description**: Head.astro exists
**Command**: `test -f apps/landing/src/components/layout/Head.astro`

## head-emits-title
**Description**: emits a <title> tag
**Command**: `test -f apps/landing/src/components/layout/Head.astro && grep -qE '<title>' apps/landing/src/components/layout/Head.astro`

## head-emits-og
**Description**: emits Open Graph meta tags
**Command**: `test -f apps/landing/src/components/layout/Head.astro && grep -qE 'og:title|og:description|og:image' apps/landing/src/components/layout/Head.astro`

## head-emits-twitter
**Description**: emits Twitter card meta
**Command**: `test -f apps/landing/src/components/layout/Head.astro && grep -qE 'twitter:card' apps/landing/src/components/layout/Head.astro`

## head-emits-canonical
**Description**: emits canonical link
**Command**: `test -f apps/landing/src/components/layout/Head.astro && grep -qE 'rel="canonical"' apps/landing/src/components/layout/Head.astro`