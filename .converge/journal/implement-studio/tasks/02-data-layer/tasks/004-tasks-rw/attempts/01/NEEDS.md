# Needs: 02-data-layer/004-tasks-rw

## Expected Outputs

- `packages/converge-studio/src/lib/converge-adapter/tasks.ts`
- `packages/converge-studio/src/lib/converge-adapter/frontmatter.ts`

## Checks

- **tasks-module-exists**: tasks.ts and frontmatter.ts exist
- **typecheck**: Modules typecheck
- **read-real-task**: readTaskMd returns frontmatter for a known task
