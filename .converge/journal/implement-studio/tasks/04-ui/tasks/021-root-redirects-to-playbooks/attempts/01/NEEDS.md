# Needs: 04-ui/021-root-redirects-to-playbooks

## Expected Outputs

- `packages/converge-studio/src/app/page.tsx`

## Checks

- **page-exists**: src/app/page.tsx exists
- **page-redirects**: page.tsx calls redirect('/playbooks')
- **page-no-mc-content**: page.tsx renders nothing else (no MC dashboard, no launch sequence)
- **typecheck-passes**: Studio typechecks
