# Needs: 01-archive-existing

## Inputs

- `docs`

## Expected Outputs

- `docs/_internal`

## Checks

- **internal-dir-exists**: docs/_internal/ directory exists (created idempotently)
- **no-legacy-files-at-docs-root**: no known-legacy markdown files remain at docs/ root
- **no-legacy-dirs-at-docs-root**: no known-legacy subdirectories remain at docs/ root (blog, cli, playbooks moved to _internal)
