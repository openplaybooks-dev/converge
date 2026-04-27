# Needs: 04-build-sections/005-04-integrate

## Description

Mount the InteractiveComparison component in src/pages/index.astro at the correct position.

## Inputs

- `apps/landing/src/components/sections/InteractiveComparison.astro`
- `apps/landing/.content/sections.json`

## Expected Outputs

- `apps/landing/src/pages/index.astro`

## Checks

- **index-astro-exists**: index.astro exists
- **component-imported**: InteractiveComparison is imported in index.astro
- **component-rendered**: <InteractiveComparison> is rendered in index.astro
- **build-clean**: astro check still passes after integration
