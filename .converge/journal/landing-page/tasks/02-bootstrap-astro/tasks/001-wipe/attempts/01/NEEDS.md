# Needs: 02-bootstrap-astro/001-wipe

## Expected Outputs

- `apps/landing/.wiped`

## Checks

- **src-removed**: apps/landing/src no longer exists (apps/landing dir intact, src wiped)
- **astro-config-removed**: no astro.config remains (apps/landing dir intact, configs wiped)
- **package-json-kept**: package.json was preserved
- **package-name-correct**: package.json#name is still @converge/landing
- **wipe-marker**: .wiped marker file exists (so the next task knows the wipe ran)
