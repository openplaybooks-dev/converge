# Needs: 06-guides/007-customize-an-example

## Inputs

- `docs/_examples.json`
- `examples/cinematic-video-production/README.md`
- `examples/data-pipeline/.converge/playbooks/default/playbook.yml`

## Expected Outputs

- `docs/guides/customize-an-example.md`

## Checks

- **page-exists**: page exists
- **page-frontmatter**: title + sources frontmatter
- **lists-edit-targets**: lists the most-edited files
- **links-back-to-gallery**: links back to the examples gallery
- **word-count-ok**: 600-1500 words
