# Checks: 04-build-sections/005-03-build

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## component-exists
**Description**: InteractiveComparison.astro was created
**Command**: `test -f apps/landing/src/components/sections/InteractiveComparison.astro`

## component-uses-section-wrapper
**Description**: component uses <Section> layout primitive
**Command**: `test -f apps/landing/src/components/sections/InteractiveComparison.astro && grep -qE '<Section\s' apps/landing/src/components/sections/InteractiveComparison.astro`

## component-typecheck
**Description**: astro check passes for this component
**Command**: `test -f apps/landing/src/components/sections/InteractiveComparison.astro && pnpm --filter @converge/landing astro check 2>&1 | (! grep -E 'error.*InteractiveComparison\.astro')`

## no-hardcoded-hex
**Description**: no hardcoded hex colors (use brand tokens via Tailwind classes)
**Command**: `test -f apps/landing/src/components/sections/InteractiveComparison.astro && ! grep -qE '#[0-9a-fA-F]{3,6}\b' apps/landing/src/components/sections/InteractiveComparison.astro`

## no-placeholders
**Description**: no placeholder copy
**Command**: `test -f apps/landing/src/components/sections/InteractiveComparison.astro && ! grep -qE 'Lorem|placeholder content|TBD|FIXME|TODO:' apps/landing/src/components/sections/InteractiveComparison.astro`