# Needs: 04-build-sections/004-03-build

## Description

Build the FeatureGrid.astro component from SPEC + DESIGN, with real copy from source files.

## Inputs

- `apps/landing/.content/sections/feature-grid/SPEC.md`
- `apps/landing/.content/sections/feature-grid/DESIGN.md`
- `README.md`
- `docs/concepts`

## Expected Outputs

- `apps/landing/src/components/sections/FeatureGrid.astro`

## Checks

- **component-exists**: FeatureGrid.astro was created
- **component-uses-section-wrapper**: component uses <Section> layout primitive
- **component-typecheck**: astro check passes for this component
- **no-hardcoded-hex**: no hardcoded hex colors (use brand tokens via Tailwind classes)
- **no-placeholders**: no placeholder copy
