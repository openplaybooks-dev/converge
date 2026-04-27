# Checks: 04-build-sections/001-03-build

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## component-exists
**Description**: Hero.astro was created
**Command**: `test -f apps/landing/src/components/sections/Hero.astro`

## component-uses-section-wrapper
**Description**: component uses <Section> layout primitive
**Command**: `test -f apps/landing/src/components/sections/Hero.astro && grep -qE '<Section\s' apps/landing/src/components/sections/Hero.astro`

## component-typecheck
**Description**: astro check passes for this component
**Command**: `test -f apps/landing/src/components/sections/Hero.astro && pnpm --filter @converge/landing astro check 2>&1 | (! grep -E 'error.*Hero\.astro')`

## no-hardcoded-hex
**Description**: no hardcoded hex colors (use brand tokens via Tailwind classes)
**Command**: `test -f apps/landing/src/components/sections/Hero.astro && ! grep -qE '#[0-9a-fA-F]{3,6}\b' apps/landing/src/components/sections/Hero.astro`

## no-placeholders
**Description**: no placeholder copy
**Command**: `test -f apps/landing/src/components/sections/Hero.astro && ! grep -qE 'Lorem|placeholder content|TBD|FIXME|TODO:' apps/landing/src/components/sections/Hero.astro`