# Needs: 06-wiring/004-route-validation

## Expected Outputs

- `packages/converge-studio/src/app`

## Checks

- **no-segment-after-catchall**: No directory under src/app has a static segment after a [...catch-all] segment (Next.js refuses to start otherwise)
- **routes-respond-200**: Dev server returns 200 on /, /playbooks/implement-studio, /runs, /api/playbooks, and the /api/events SSE endpoint opens
