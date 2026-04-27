# Needs: 03-design-system/001-extract-tokens

## Inputs

- `apps/landing/.content/brand.json`

## Expected Outputs

- `apps/landing/src/styles/tokens.json`
- `apps/landing/src/styles/tokens.css`

## Checks

- **tokens-json-exists**: tokens.json exists and is valid JSON
- **tokens-css-exists**: tokens.css exists
- **palette-keys**: tokens.json has at least bg/indigo/text/accent colors
- **tokens-css-has-variables**: tokens.css defines at least 3 color custom properties
- **globals-imports-tokens**: globals.css imports tokens.css
