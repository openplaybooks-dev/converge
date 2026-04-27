# Needs: 06-guides/004-build-a-software-project

## Inputs

- `examples/flutter-app/README.md`
- `examples/fullstack-app/README.md`
- `examples/stitch-to-flutter/README.md`
- `examples/stitch-to-flutter-baby-watch-v2/.converge/playbooks/default/playbook.yml`
- `packages/core/src/storage/types.ts`

## Expected Outputs

- `docs/guides/build-a-software-project.md`

## Checks

- **page-exists**: page exists
- **page-frontmatter**: title + sources frontmatter
- **anchored-on-software-examples**: page anchors on a real software example
- **shows-playbook-yml**: shows a playbook.yml shape
- **shows-task-md**: covers TASK.md
- **word-count-ok**: 800-1800 words
