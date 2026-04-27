# Needs: 04-build-sections/005-01-spec

## Description

Write SPEC.md for the Converge vs. step-driven section: intent, props, content sources, slots, acceptance criteria.

## Inputs

- `apps/landing/.content/sections.json`
- `apps/landing/.content/brand.json`
- `README.md`
- `docs/concepts`
- `docs/getting-started/why-converge.md`

## Expected Outputs

- `apps/landing/.content/sections/comparison/SPEC.md`

## Checks

- **spec-md-exists**: apps/landing/.content/sections/comparison/SPEC.md exists
- **spec-has-content**: SPEC.md has >=40 lines (substantive)
- **spec-references-brand**: SPEC references brand spec or tokens
