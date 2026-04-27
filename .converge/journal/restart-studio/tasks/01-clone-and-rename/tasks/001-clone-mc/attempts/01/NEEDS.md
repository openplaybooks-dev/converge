# Needs: 01-clone-and-rename/001-clone-mc

## Expected Outputs

- `packages/studio/UPSTREAM_SHA`
- `packages/studio/package.json`

## Checks

- **studio-dir-populated**: packages/studio/ has src/app and package.json
- **upstream-sha-pinned**: UPSTREAM_SHA matches the pin
- **dot-git-removed**: .git directory removed
