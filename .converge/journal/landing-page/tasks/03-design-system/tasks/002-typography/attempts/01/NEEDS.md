# Needs: 03-design-system/002-typography

## Inputs

- `apps/landing/src/styles/tokens.css`
- `apps/landing/.content/brand.json`

## Expected Outputs

- `apps/landing/src/styles/typography.css`
- `apps/landing/package.json`

## Checks

- **fontsource-inter-installed**: Inter font package is installed
- **fontsource-jetbrains-installed**: JetBrains Mono font package is installed
- **typography-css-exists**: src/styles/typography.css exists
- **typography-imports-fonts**: typography.css imports the font packages
- **globals-imports-typography**: globals.css imports typography.css
