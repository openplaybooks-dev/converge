# Needs: 04-ui/020-converge-shell

## Expected Outputs

- `packages/converge-studio/src/app/layout.tsx`
- `packages/converge-studio/src/components/layout/converge-header.tsx`

## Checks

- **layout-exists**: Slim layout.tsx exists
- **header-exists**: Converge header component exists
- **header-imported-by-layout**: layout.tsx imports the converge header
- **layout-has-no-mc-imports**: layout.tsx imports no Mission Control component
- **typecheck-passes**: Studio typechecks
