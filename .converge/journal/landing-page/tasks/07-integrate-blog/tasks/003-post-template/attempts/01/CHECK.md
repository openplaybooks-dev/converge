# Checks: 07-integrate-blog/003-post-template

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## post-template-exists
**Description**: blog/[slug].astro exists
**Command**: `test -f apps/landing/src/pages/blog/[slug].astro`

## post-uses-getStaticPaths
**Description**: uses getStaticPaths to enumerate slugs
**Command**: `test -f apps/landing/src/pages/blog/[slug].astro && grep -qE 'getStaticPaths' apps/landing/src/pages/blog/[slug].astro`

## post-renders-content
**Description**: renders post content via the entry's render() result
**Command**: `test -f apps/landing/src/pages/blog/[slug].astro && grep -qE 'render\(\)|<Content\s' apps/landing/src/pages/blog/[slug].astro`