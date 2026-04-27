# Checks: 03-design-system/003-base-components

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## components-exist
**Description**: all six base components exist
**Command**: `for f in Button Badge Card CodeBlock Pill Disclosure; do test -f apps/landing/src/components/ui/$f.astro || exit 1; done`

## components-typecheck
**Description**: astro check has no errors in components/ui
**Command**: `test -d apps/landing/src/components/ui && pnpm --filter @converge/landing astro check 2>&1 | (! grep -E 'error.*components/ui')`

## button-supports-variants
**Description**: Button supports primary/secondary/ghost variants
**Command**: `test -f apps/landing/src/components/ui/Button.astro && grep -qE 'primary|secondary|ghost' apps/landing/src/components/ui/Button.astro`

## codeblock-uses-shiki
**Description**: CodeBlock uses shiki / astro-code highlighting
**Command**: `test -f apps/landing/src/components/ui/CodeBlock.astro && grep -qE 'shiki|astro-code|language-' apps/landing/src/components/ui/CodeBlock.astro`

## no-react-no-vue
**Description**: components are pure Astro (no React/Vue/Svelte/JSX)
**Command**: `test -d apps/landing/src/components/ui && test -z "$(find apps/landing/src/components/ui -name '*.tsx' -o -name '*.jsx' -o -name '*.vue' -o -name '*.svelte' 2>/dev/null)"`