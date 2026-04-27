# Needs: 04-ui/015-empty-state-onboarding

## Expected Outputs

- `packages/converge-studio/src/components/empty-state.tsx`

## Checks

- **empty-state-component-exists**: EmptyState component exists
- **empty-state-rendered-by-index**: The /playbooks index page imports EmptyState (so 0-playbook case renders it)
- **typecheck-passes**: typecheck-passes
