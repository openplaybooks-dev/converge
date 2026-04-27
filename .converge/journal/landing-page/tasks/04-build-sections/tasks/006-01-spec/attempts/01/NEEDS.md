# Needs: 04-build-sections/006-01-spec

## Description

Write SPEC.md for the From zero to converged in 60s section: intent, props, content sources, slots, acceptance criteria.

## Inputs

- `apps/landing/.content/sections.json`
- `apps/landing/.content/brand.json`
- `README.md`
- `docs/concepts`
- `docs/getting-started/why-converge.md`

## Expected Outputs

- `apps/landing/.content/sections/quickstart/SPEC.md`

## Checks

- **spec-md-exists**: apps/landing/.content/sections/quickstart/SPEC.md exists
- **spec-has-content**: SPEC.md has >=40 lines (substantive)
- **spec-references-brand**: SPEC references brand spec or tokens
