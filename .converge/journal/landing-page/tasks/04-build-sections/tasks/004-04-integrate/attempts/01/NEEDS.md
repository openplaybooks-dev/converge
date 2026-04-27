# Needs: 04-build-sections/004-04-integrate

## Description

Mount the FeatureGrid component in src/pages/index.astro at the correct position.

## Inputs

- `apps/landing/src/components/sections/FeatureGrid.astro`
- `apps/landing/.content/sections.json`

## Expected Outputs

- `apps/landing/src/pages/index.astro`

## Checks

- **index-astro-exists**: index.astro exists
- **component-imported**: FeatureGrid is imported in index.astro
- **component-rendered**: <FeatureGrid> is rendered in index.astro
- **build-clean**: astro check still passes after integration
