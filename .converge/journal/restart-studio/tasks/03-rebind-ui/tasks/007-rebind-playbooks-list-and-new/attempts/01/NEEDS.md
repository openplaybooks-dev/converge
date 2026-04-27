# Needs: 03-rebind-ui/007-rebind-playbooks-list-and-new

## Expected Outputs

- `packages/studio/src/app/playbooks/page.tsx`
- `packages/studio/src/app/playbooks/new/page.tsx`

## Checks

- **list-page-exists**: /playbooks/page.tsx exists and lists playbooks
- **new-page-exists**: /playbooks/new/page.tsx exists with a form posting to /api/playbooks
