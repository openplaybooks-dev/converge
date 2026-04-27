# Needs: 01-prepare-spec/001-sitemap

## Inputs

- `docs/_ia.json`
- `README.md`

## Expected Outputs

- `apps/landing/.content/sitemap.json`

## Checks

- **sitemap-json-exists**: sitemap.json exists
- **sitemap-valid-json**: sitemap.json is valid JSON
- **includes-home-and-docs**: includes / and at least one /docs/ route
- **includes-blog**: includes /blog route
