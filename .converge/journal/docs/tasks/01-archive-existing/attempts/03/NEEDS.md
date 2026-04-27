# Needs: 01-archive-existing

## Inputs

- `.claude`

## Expected Outputs

- `.claude/_internal`

## Checks

- **internal-dir-exists**: .claude/_internal/ directory exists (created idempotently)
- **no-legacy-files-at-.claude-root**: no known-legacy markdown files remain at .claude/ root
- **no-legacy-dirs-at-.claude-root**: no known-legacy subdirectories remain at .claude/ root (blog, cli, playbooks moved to _internal)
