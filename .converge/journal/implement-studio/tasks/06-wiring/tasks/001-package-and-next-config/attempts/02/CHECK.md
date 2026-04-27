# Checks: 06-wiring/001-package-and-next-config

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## next-config-exists
**Description**: next.config.mjs exists
**Command**: `test -f packages/converge-studio/next.config.mjs`

## transpile-packages
**Description**: next.config.mjs transpiles workspace packages
**Command**: `grep -q '@converge/core' packages/converge-studio/next.config.mjs && grep -q 'transpilePackages' packages/converge-studio/next.config.mjs`

## next-intl-plugin-wired
**Description**: next.config.mjs wraps the export with next-intl/plugin
**Command**: `grep -q 'next-intl/plugin' packages/converge-studio/next.config.mjs && grep -q "./src/i18n/request" packages/converge-studio/next.config.mjs`

## layout-deps-declared
**Description**: next-intl and next-themes are declared in package.json (layout.tsx imports both)
**Command**: `node -e "const p=require('./packages/converge-studio/package.json');const d={...p.dependencies,...p.devDependencies};process.exit(d['next-intl']&&d['next-themes']?0:1)"`

## dev-script-runs
**Description**: studio typechecks (proxy for build readiness)
**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`

## dev-server-200-on-root
**Description**: pnpm dev boots within 30s and / returns 200
**Command**: `bash -c 'cd packages/converge-studio && (pnpm dev > /tmp/converge-studio-dev.log 2>&1 &); pid=$!; for i in $(seq 1 30); do sleep 1; code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/ || echo 000); if [ "$code" = "200" ]; then kill $pid 2>/dev/null; exit 0; fi; done; kill $pid 2>/dev/null; cat /tmp/converge-studio-dev.log; exit 1'`