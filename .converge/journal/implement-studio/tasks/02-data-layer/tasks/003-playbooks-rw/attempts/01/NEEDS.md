# Needs: 02-data-layer/003-playbooks-rw

## Expected Outputs

- `packages/converge-studio/src/lib/converge-adapter/playbooks.ts`

## Checks

- **playbooks-module-exists**: playbooks.ts exists
- **typecheck**: Module typechecks
- **list-real-playbooks**: listPlaybooks returns at least one of the real playbooks in this repo
