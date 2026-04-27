# Checks: 07-integrate-blog/005-og-images

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## og-route-exists
**Description**: dynamic OG image route exists
**Command**: `test -f apps/landing/src/pages/og/[slug].png.ts`

## og-uses-canvas-or-svg
**Description**: uses a real image-generation library or SVG-to-PNG path
**Command**: `test -f apps/landing/src/pages/og/[slug].png.ts && grep -qE 'astro-og-canvas|sharp|satori|svg' apps/landing/src/pages/og/[slug].png.ts`