# Needs: 04-build-sections/006-04-integrate

## Description

Mount the Quickstart component in src/pages/index.astro at the correct position.

## Inputs

- `apps/landing/src/components/sections/Quickstart.astro`
- `apps/landing/.content/sections.json`

## Expected Outputs

- `apps/landing/src/pages/index.astro`

## Checks

- **index-astro-exists**: index.astro exists
- **component-imported**: Quickstart is imported in index.astro
- **component-rendered**: <Quickstart> is rendered in index.astro
- **build-clean**: astro check still passes after integration
