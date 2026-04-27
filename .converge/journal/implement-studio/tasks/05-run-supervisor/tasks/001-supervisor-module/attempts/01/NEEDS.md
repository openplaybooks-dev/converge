# Needs: 05-run-supervisor/001-supervisor-module

## Expected Outputs

- `packages/converge-studio/src/lib/run-supervisor.ts`
- `packages/converge-studio/src/lib/ring-buffer.ts`

## Checks

- **module-exists**: Supervisor module exists
- **typecheck**: Module typechecks
- **api-surface**: Exposes startRun, getRun, listRuns
