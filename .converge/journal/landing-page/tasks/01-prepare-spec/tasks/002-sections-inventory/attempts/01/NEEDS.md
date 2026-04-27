# Needs: 01-prepare-spec/002-sections-inventory

## Inputs

- `README.md`
- `docs/concepts`
- `docs/getting-started/why-converge.md`

## Expected Outputs

- `apps/landing/.content/sections.json`

## Checks

- **sections-json-exists**: sections.json exists
- **sections-json-valid**: sections.json is valid JSON
- **sections-count**: at least 8 sections defined
- **sections-have-required-fields**: every section has id, title, componentName, intent
- **hero-first**: first section is hero
- **cta-last**: last section is cta-banner
