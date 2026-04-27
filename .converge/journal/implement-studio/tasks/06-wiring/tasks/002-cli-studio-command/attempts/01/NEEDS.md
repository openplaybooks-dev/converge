# Needs: 06-wiring/002-cli-studio-command

## Expected Outputs

- `packages/cli/src/commands-studio.ts`
- `packages/cli/src/main.ts`
- `packages/cli/package.json`

## Checks

- **command-file-exists**: commands-studio.ts exists
- **registered-in-main**: main.ts references commands-studio
- **optional-dep-on-studio**: cli has optionalDependency on @converge/studio
- **studio-help**: `converge studio --help` runs and mentions studio
