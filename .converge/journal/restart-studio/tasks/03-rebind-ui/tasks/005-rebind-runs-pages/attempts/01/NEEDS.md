# Needs: 03-rebind-ui/005-rebind-runs-pages

## Expected Outputs

- `packages/studio/src/app/runs/page.tsx`
- `packages/studio/src/app/runs/[playbook]/[sessionId]/page.tsx`

## Checks

- **runs-list-exists**: /runs/page.tsx exists and uses views primitives
- **live-session-view-exists**: live session view exists and consumes runs SSE
