# Checks: 07-integrate-blog/002-listing-page

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## blog-index-exists
**Description**: blog/index.astro exists
**Command**: `test -f apps/landing/src/pages/blog/index.astro`

## blog-index-uses-getCollection
**Description**: uses getCollection('blog')
**Command**: `test -f apps/landing/src/pages/blog/index.astro && grep -qE 'getCollection.*blog' apps/landing/src/pages/blog/index.astro`

## blog-index-uses-mainlayout
**Description**: wraps in MainLayout
**Command**: `test -f apps/landing/src/pages/blog/index.astro && grep -qE 'MainLayout' apps/landing/src/pages/blog/index.astro`