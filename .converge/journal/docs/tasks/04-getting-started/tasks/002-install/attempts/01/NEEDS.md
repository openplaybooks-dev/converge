# Needs: 04-getting-started/002-install

## Inputs

- `README.md`
- `packages/cli/package.json`
- `package.json`

## Expected Outputs

- `docs/getting-started/install.md`

## Checks

- **page-exists**: page exists
- **page-frontmatter**: title + sources frontmatter
- **shows-pnpm**: documents pnpm install
- **shows-verify-step**: documents how to verify install (version or help)
- **shows-env-vars**: mentions provider API key env vars
