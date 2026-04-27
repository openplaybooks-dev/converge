# Needs: 06-guides/002-generate-something-repeatedly

## Inputs

- `examples/data-pipeline/README.md`
- `examples/data-pipeline/.converge/playbooks/default/playbook.yml`
- `examples/cinematic-video-production/README.md`
- `examples/cinematic-video-production/.converge/playbooks/default/playbook.yml`
- `packages/core/src/storage/types.ts`

## Expected Outputs

- `docs/guides/generate-something-repeatedly.md`

## Checks

- **page-exists**: page exists
- **page-frontmatter**: title + sources frontmatter
- **anchored-on-real-example**: page anchors on a real example from the gallery
- **shows-wbs-or-template-pattern**: shows the pattern for one-task-per-input-item
- **word-count-ok**: 700-1500 words
