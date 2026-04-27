# Needs: 01-vendor/002-package-rename

## Expected Outputs

- `packages/converge-studio/package.json`
- `packages/converge-studio/tsconfig.json`

## Checks

- **package-name**: package.json name is @converge/studio
- **workspace-deps**: Depends on @converge/core and @converge/project-root via workspace protocol
- **type-module**: package.json has type=module
- **scripts-present**: dev, build, start, typecheck scripts defined
- **install-resolves**: pnpm install resolves the new workspace
