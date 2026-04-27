# Needs: 04-ui/010-shell-and-branding

## Expected Outputs

- `packages/converge-studio/src/app/layout.tsx`

## Checks

- **layout-exists**: layout.tsx exists
- **no-mc-banners**: layout.tsx does not import any of the deleted MC banners/wizards/modals
- **converge-metadata**: layout.tsx metadata title references converge, not Mission Control
- **typecheck-passes**: Studio still typechecks
