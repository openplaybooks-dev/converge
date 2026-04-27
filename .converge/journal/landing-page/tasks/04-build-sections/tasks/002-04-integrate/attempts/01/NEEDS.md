# Needs: 04-build-sections/002-04-integrate

## Description

Mount the SocialProof component in src/pages/index.astro at the correct position.

## Inputs

- `apps/landing/src/components/sections/SocialProof.astro`
- `apps/landing/.content/sections.json`

## Expected Outputs

- `apps/landing/src/pages/index.astro`

## Checks

- **index-astro-exists**: index.astro exists
- **component-imported**: SocialProof is imported in index.astro
- **component-rendered**: <SocialProof> is rendered in index.astro
- **build-clean**: astro check still passes after integration
