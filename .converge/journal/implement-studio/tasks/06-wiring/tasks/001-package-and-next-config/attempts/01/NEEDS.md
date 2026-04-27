# Needs: 06-wiring/001-package-and-next-config

## Expected Outputs

- `packages/converge-studio/package.json`
- `packages/converge-studio/next.config.mjs`
- `packages/converge-studio/tsconfig.json`

## Checks

- **next-config-exists**: next.config.mjs exists
- **transpile-packages**: next.config.mjs transpiles workspace packages
- **dev-script-runs**: studio typechecks (proxy for build readiness)
