# Needs: 08-generate-assets/001-favicon-set

## Inputs

- `apps/landing/src/icons/converge-mark.svg`
- `apps/landing/src/.content/brand.json`

## Expected Outputs

- `apps/landing/public/favicon.svg`
- `apps/landing/public/apple-touch-icon.png`
- `apps/landing/public/site.webmanifest`

## Checks

- **favicon-svg-exists**: favicon.svg exists
- **apple-touch-icon-exists**: apple-touch-icon.png exists
- **webmanifest-exists**: site.webmanifest exists and is valid JSON
- **webmanifest-has-name**: webmanifest name is Converge
