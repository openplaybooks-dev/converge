# Needs: 04-ui/011-logs-panel

## Expected Outputs

- `packages/converge-studio/src/app/runs/[playbook]/[sessionId]/logs`
- `packages/converge-studio/src/app/api/runs/[playbook]/[sessionId]/logs`

## Checks

- **logs-page-exists**: Logs page exists under run detail
- **logs-api-exists**: Logs API route exists and returns JSON
- **typecheck-passes**: typecheck-passes
