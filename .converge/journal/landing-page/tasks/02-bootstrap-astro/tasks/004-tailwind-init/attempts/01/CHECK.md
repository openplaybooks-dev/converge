# Checks: 02-bootstrap-astro/004-tailwind-init

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## tailwind-config-exists
**Description**: tailwind.config.mjs exists
**Command**: `test -f apps/landing/tailwind.config.mjs`

## globals-css-exists
**Description**: src/styles/globals.css exists
**Command**: `test -f apps/landing/src/styles/globals.css`

## globals-imports-tailwind
**Description**: globals.css imports tailwind (v3 @tailwind or v4 @import)
**Command**: `test -f apps/landing/src/styles/globals.css && grep -qE '@import\s+"tailwindcss"|@tailwind\s+(base|components|utilities)' apps/landing/src/styles/globals.css`

## tailwind-content-includes-src
**Description**: tailwind.config content paths include src/**/*.astro
**Command**: `test -f apps/landing/tailwind.config.mjs && grep -qE "src/.*astro|src/.*\\{astro" apps/landing/tailwind.config.mjs`

## theme-uses-brand-palette
**Description**: tailwind theme references brand palette colors
**Command**: `test -f apps/landing/tailwind.config.mjs && test -f apps/landing/.content/brand.json && grep -qE 'indigo|6366F1' apps/landing/tailwind.config.mjs`