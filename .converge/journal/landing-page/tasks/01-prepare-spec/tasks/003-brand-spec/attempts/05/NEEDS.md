# Needs: 01-prepare-spec/003-brand-spec

## Inputs

- `banner.svg`
- `README.md`

## Expected Outputs

- `apps/landing/src/.content/brand.json`

## Checks

- **brand-json-exists**: brand.json exists
- **brand-json-valid**: brand.json is valid JSON
- **has-palette**: palette has at least 4 named colors
- **has-tagline**: tagline matches canonical
- **has-voice**: voice has tone descriptors
