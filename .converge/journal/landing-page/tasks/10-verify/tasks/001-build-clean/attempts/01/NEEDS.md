# Needs: 10-verify/001-build-clean

## Inputs

- `apps/landing/src`

## Expected Outputs

- `apps/landing/dist`

## Checks

- **build-succeeds**: pnpm build exits 0
- **dist-emitted**: dist/ contains index.html
- **no-build-warnings**: build emits no warnings
