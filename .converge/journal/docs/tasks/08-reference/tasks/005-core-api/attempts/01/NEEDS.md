# Needs: 08-reference/005-core-api

## Inputs

- `packages/core/src/index.ts`
- `packages/core/package.json`

## Expected Outputs

- `docs/reference/core-api.md`

## Checks

- **page-exists**: page exists
- **lists-exports**: lists at least 8 exported symbols
- **covers-exports-map**: covers the package exports map (subpaths)
