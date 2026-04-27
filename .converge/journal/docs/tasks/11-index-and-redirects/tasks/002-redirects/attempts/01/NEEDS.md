# Needs: 11-index-and-redirects/002-redirects

## Inputs

- `docs/_internal`

## Expected Outputs

- `docs/_redirects.json`

## Checks

- **redirects-exists**: redirects manifest exists and is valid JSON
- **redirects-array**: has a redirects array (possibly empty)
