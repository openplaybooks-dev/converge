# Needs: 04-ui/008-promote-playbooks-to-root

## Expected Outputs

- `packages/converge-studio/src/app`

## Checks

- **root-page-exists**: src/app/page.tsx exists (i.e. / is served by the playbooks index)
- **studio-route-group-removed**: The (studio) route group is gone
- **playbooks-routes-at-root**: /playbooks/[name] and /runs are at the URL root
- **typecheck-passes**: Studio still typechecks after the move
