# Checks: 09-polish/003-image-opt

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## image-component-exists
**Description**: Image.astro exists
**Command**: `test -f apps/landing/src/components/ui/Image.astro`

## image-uses-astro-assets
**Description**: uses astro:assets Image component
**Command**: `test -f apps/landing/src/components/ui/Image.astro && grep -qE 'astro:assets' apps/landing/src/components/ui/Image.astro`

## image-defaults-to-avif-or-webp
**Description**: defaults format to avif or webp
**Command**: `test -f apps/landing/src/components/ui/Image.astro && grep -qE 'avif|webp' apps/landing/src/components/ui/Image.astro`

## image-defaults-to-lazy
**Description**: defaults loading to lazy
**Command**: `test -f apps/landing/src/components/ui/Image.astro && grep -qE "loading.*lazy|loading=['\"]lazy" apps/landing/src/components/ui/Image.astro`