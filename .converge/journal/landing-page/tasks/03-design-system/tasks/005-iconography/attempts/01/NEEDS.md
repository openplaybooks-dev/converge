# Needs: 03-design-system/005-iconography

## Inputs

- `banner.svg`

## Expected Outputs

- `apps/landing/src/icons/converge-mark.svg`
- `apps/landing/src/icons/convergence-journey.svg`
- `apps/landing/src/components/ui/Icon.astro`
- `apps/landing/package.json`

## Checks

- **lucide-installed**: a Lucide icon package is installed
- **converge-mark-exists**: converge-mark.svg exists and is valid SVG
- **journey-svg-exists**: convergence-journey.svg exists and is valid SVG
- **icon-component-exists**: Icon.astro wrapper exists
