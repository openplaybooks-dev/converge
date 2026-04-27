# Needs: 06-guides/005-switch-providers

## Inputs

- `examples/stitch-to-flutter-baby-watch-v2/.converge/project.yml`
- `packages/core/src/config`

## Expected Outputs

- `docs/guides/switch-providers.md`

## Checks

- **page-exists**: page exists
- **page-frontmatter**: title + sources frontmatter
- **covers-claude-and-others**: covers Claude + at least one other provider
- **shows-project-yml**: shows project.yml provider config
- **word-count-ok**: 600-1500 words
