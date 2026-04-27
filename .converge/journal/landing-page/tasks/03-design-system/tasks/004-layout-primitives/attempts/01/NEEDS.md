# Needs: 03-design-system/004-layout-primitives

## Expected Outputs

- `apps/landing/src/components/layout/Container.astro`
- `apps/landing/src/components/layout/Section.astro`
- `apps/landing/src/components/layout/Grid.astro`
- `apps/landing/src/components/layout/Spacer.astro`

## Checks

- **primitives-exist**: all four layout primitives exist
- **primitives-typecheck**: astro check has no errors in components/layout
- **section-takes-id-prop**: Section accepts an id prop (for anchor navigation)
- **container-max-width**: Container caps width
