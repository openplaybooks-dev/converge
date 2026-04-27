# Needs: 04-build-sections/005-03-build

## Description

Build the InteractiveComparison.astro component from SPEC + DESIGN, with real copy from source files.

## Inputs

- `apps/landing/.content/sections/comparison/SPEC.md`
- `apps/landing/.content/sections/comparison/DESIGN.md`
- `README.md`
- `docs/concepts`

## Expected Outputs

- `apps/landing/src/components/sections/InteractiveComparison.astro`

## Checks

- **component-exists**: InteractiveComparison.astro was created
- **component-uses-section-wrapper**: component uses <Section> layout primitive
- **component-typecheck**: astro check passes for this component
- **no-hardcoded-hex**: no hardcoded hex colors (use brand tokens via Tailwind classes)
- **no-placeholders**: no placeholder copy
