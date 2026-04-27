# Needs: 04-build-sections/001-04-integrate

## Description

Mount the Hero component in src/pages/index.astro at the correct position.

## Inputs

- `apps/landing/src/components/sections/Hero.astro`
- `apps/landing/.content/sections.json`

## Expected Outputs

- `apps/landing/src/pages/index.astro`

## Checks

- **index-astro-exists**: index.astro exists
- **component-imported**: Hero is imported in index.astro
- **component-rendered**: <Hero> is rendered in index.astro
- **build-clean**: astro check still passes after integration
