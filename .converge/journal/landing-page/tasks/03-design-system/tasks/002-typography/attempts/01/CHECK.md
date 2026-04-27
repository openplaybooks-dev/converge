# Checks: 03-design-system/002-typography

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## fontsource-inter-installed
**Description**: Inter font package is installed
**Command**: `test -f apps/landing/package.json && node -e "const p=require('./apps/landing/package.json');const all={...p.dependencies,...p.devDependencies};process.exit(all['@fontsource-variable/inter']||all['@fontsource/inter']?0:1)"`

## fontsource-jetbrains-installed
**Description**: JetBrains Mono font package is installed
**Command**: `test -f apps/landing/package.json && node -e "const p=require('./apps/landing/package.json');const all={...p.dependencies,...p.devDependencies};process.exit(all['@fontsource-variable/jetbrains-mono']||all['@fontsource/jetbrains-mono']?0:1)"`

## typography-css-exists
**Description**: src/styles/typography.css exists
**Command**: `test -f apps/landing/src/styles/typography.css`

## typography-imports-fonts
**Description**: typography.css imports the font packages
**Command**: `test -f apps/landing/src/styles/typography.css && grep -qE 'fontsource|@import.*inter' apps/landing/src/styles/typography.css`

## globals-imports-typography
**Description**: globals.css imports typography.css
**Command**: `test -f apps/landing/src/styles/globals.css && grep -q 'typography.css' apps/landing/src/styles/globals.css`