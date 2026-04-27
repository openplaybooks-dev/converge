# Needs: 08-reference/002-playbook-yml

## Inputs

- `packages/core/src/storage/types.ts`
- `examples/stitch-to-flutter-baby-watch-v2/.converge/playbooks/default/playbook.yml`
- `.converge/playbooks/implement-studio/playbook.yml`

## Expected Outputs

- `docs/reference/playbook-yml.md`

## Checks

- **page-exists**: page exists
- **documents-name-and-tasks**: documents name and tasks fields
- **documents-checks**: documents checks field
- **shows-full-example**: shows a complete playbook.yml example
