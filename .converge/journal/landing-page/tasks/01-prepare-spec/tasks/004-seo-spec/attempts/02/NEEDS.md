# Needs: 01-prepare-spec/004-seo-spec

## Inputs

- `apps/landing/.content/sitemap.json`
- `apps/landing/.content/brand.json`
- `README.md`

## Expected Outputs

- `apps/landing/.content/seo.json`

## Checks

- **seo-json-exists**: seo.json exists
- **seo-json-valid**: seo.json is valid JSON
- **site-fields-present**: site has title, description, ogImage, canonical, locale
- **home-route-meta**: pages.home is defined
- **docs-route-meta**: pages.docs is defined
- **blog-route-meta**: pages.blog is defined
