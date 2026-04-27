# Needs: 02-bootstrap-astro/002-scaffold-fresh

## Inputs

- `apps/landing/.wiped`

## Expected Outputs

- `apps/landing/src`
- `apps/landing/astro.config.mjs`
- `apps/landing/tsconfig.json`

## Checks

- **src-pages-exists**: src/pages directory exists
- **index-astro-exists**: index.astro exists
- **astro-config-exists**: astro.config.mjs exists
- **tsconfig-exists**: tsconfig.json exists
- **no-upstream-brand**: no forked-theme brand strings anywhere in src/
- **package-name-still-ours**: package.json#name is still @converge/landing (overlay didn't clobber)
