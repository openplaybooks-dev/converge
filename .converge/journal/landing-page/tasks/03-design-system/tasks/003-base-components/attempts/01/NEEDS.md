# Needs: 03-design-system/003-base-components

## Expected Outputs

- `apps/landing/src/components/ui/Button.astro`
- `apps/landing/src/components/ui/Badge.astro`
- `apps/landing/src/components/ui/Card.astro`
- `apps/landing/src/components/ui/CodeBlock.astro`
- `apps/landing/src/components/ui/Pill.astro`
- `apps/landing/src/components/ui/Disclosure.astro`

## Checks

- **components-exist**: all six base components exist
- **components-typecheck**: astro check has no errors in components/ui
- **button-supports-variants**: Button supports primary/secondary/ghost variants
- **codeblock-uses-shiki**: CodeBlock uses shiki / astro-code highlighting
- **no-react-no-vue**: components are pure Astro (no React/Vue/Svelte/JSX)
