# Needs: 06-wiring/001-package-and-next-config

## Expected Outputs

- `packages/converge-studio/package.json`
- `packages/converge-studio/next.config.mjs`
- `packages/converge-studio/tsconfig.json`

## Checks

- **next-config-exists**: next.config.mjs exists
- **transpile-packages**: next.config.mjs transpiles workspace packages
- **next-intl-plugin-wired**: next.config.mjs wraps the export with next-intl/plugin
- **layout-deps-declared**: next-intl and next-themes are declared in package.json (layout.tsx imports both)
- **dev-script-runs**: studio typechecks (proxy for build readiness)
- **dev-server-200-on-root**: pnpm dev boots within 30s and / returns 200
