# Needs: 06-integrate-docs/002-sidebar-from-ia

## Inputs

- `docs/_ia.json`
- `docs`

## Expected Outputs

- `apps/landing/astro.config.mjs`
- `apps/landing/src/content.config.ts`

## Checks

- **ia-json-exists**: docs/_ia.json exists (owned by docs playbook)
- **content-config-exists**: src/content.config.ts exists
- **docs-loader-configured**: content.config.ts uses docsLoader from Starlight
- **sidebar-references-ia**: astro.config.mjs imports/reads docs/_ia.json
