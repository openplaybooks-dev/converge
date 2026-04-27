# Needs: 04-build-sections/008-04-integrate

## Description

Mount the CtaBanner component in src/pages/index.astro at the correct position.

## Inputs

- `apps/landing/src/components/sections/CtaBanner.astro`
- `apps/landing/.content/sections.json`

## Expected Outputs

- `apps/landing/src/pages/index.astro`

## Checks

- **index-astro-exists**: index.astro exists
- **component-imported**: CtaBanner is imported in index.astro
- **component-rendered**: <CtaBanner> is rendered in index.astro
- **build-clean**: astro check still passes after integration
