# Needs: 04-build-sections/003-04-integrate

## Description

Mount the ProblemSolution component in src/pages/index.astro at the correct position.

## Inputs

- `apps/landing/src/components/sections/ProblemSolution.astro`
- `apps/landing/.content/sections.json`

## Expected Outputs

- `apps/landing/src/pages/index.astro`

## Checks

- **index-astro-exists**: index.astro exists
- **component-imported**: ProblemSolution is imported in index.astro
- **component-rendered**: <ProblemSolution> is rendered in index.astro
- **build-clean**: astro check still passes after integration
