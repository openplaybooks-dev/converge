# Checks: 03-design-system/005-iconography

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## lucide-installed
**Description**: a Lucide icon package is installed
**Command**: `test -f apps/landing/package.json && node -e "const p=require('./apps/landing/package.json');const all={...p.dependencies,...p.devDependencies};process.exit((all['@iconify-json/lucide']||all['lucide-astro']||all['astro-icon'])?0:1)"`

## converge-mark-exists
**Description**: converge-mark.svg exists and is valid SVG
**Command**: `test -f apps/landing/src/icons/converge-mark.svg && grep -q '<svg' apps/landing/src/icons/converge-mark.svg`

## journey-svg-exists
**Description**: convergence-journey.svg exists and is valid SVG
**Command**: `test -f apps/landing/src/icons/convergence-journey.svg && grep -q '<svg' apps/landing/src/icons/convergence-journey.svg`

## icon-component-exists
**Description**: Icon.astro wrapper exists
**Command**: `test -f apps/landing/src/components/ui/Icon.astro`