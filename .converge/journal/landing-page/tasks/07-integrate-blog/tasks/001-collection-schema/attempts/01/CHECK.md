# Checks: 07-integrate-blog/001-collection-schema

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## blog-collection-defined
**Description**: src/content.config.ts defines a blog collection
**Command**: `test -f apps/landing/src/content.config.ts && grep -qE 'blog\s*:\s*defineCollection' apps/landing/src/content.config.ts`

## schema-uses-zod
**Description**: schema uses zod fields
**Command**: `test -f apps/landing/src/content.config.ts && grep -qE 'z\.string|z\.coerce\.date|z\.array' apps/landing/src/content.config.ts`

## blog-content-dir-exists
**Description**: src/content/blog/ directory exists (empty is fine, seed posts come later)
**Command**: `test -d apps/landing/src/content/blog`

## build-still-clean
**Description**: build still passes with the new collection
**Command**: `test -f apps/landing/package.json && pnpm --filter @converge/landing build`