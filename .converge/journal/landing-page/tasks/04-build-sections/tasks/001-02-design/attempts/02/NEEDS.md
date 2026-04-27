# Needs: 04-build-sections/001-02-design

## Description

Translate SPEC.md into a structural DESIGN.md describing component shape, props, slots, states.

## Inputs

- `apps/landing/.content/sections/hero/SPEC.md`
- `apps/landing/src/components/ui`
- `apps/landing/src/components/layout`

## Expected Outputs

- `apps/landing/.content/sections/hero/DESIGN.md`

## Checks

- **design-md-exists**: apps/landing/.content/sections/hero/DESIGN.md exists
- **design-has-content**: DESIGN.md has >=30 lines
- **design-lists-imports**: DESIGN.md lists which UI/layout primitives to import
