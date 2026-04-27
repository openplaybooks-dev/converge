# Needs: 06-integrate-docs/004-redirects

## Inputs

- `docs/_redirects.json`

## Expected Outputs

- `apps/landing/public/_redirects`

## Checks

- **redirects-file-exists**: public/_redirects exists
- **docs-root-redirect**: /docs redirects to a real doc page
- **legacy-redirects-merged**: every entry in docs/_redirects.json appears in public/_redirects
