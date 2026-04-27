# Needs: 04-build-sections/007-04-integrate

## Description

Mount the Faq component in src/pages/index.astro at the correct position.

## Inputs

- `apps/landing/src/components/sections/Faq.astro`
- `apps/landing/.content/sections.json`

## Expected Outputs

- `apps/landing/src/pages/index.astro`

## Checks

- **index-astro-exists**: index.astro exists
- **component-imported**: Faq is imported in index.astro
- **component-rendered**: <Faq> is rendered in index.astro
- **build-clean**: astro check still passes after integration
