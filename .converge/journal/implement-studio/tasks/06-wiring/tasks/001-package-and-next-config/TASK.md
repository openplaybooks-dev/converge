---
id: 001-package-and-next-config
title: Finalize package.json and next.config.mjs
outputs:
  - packages/converge-studio/package.json
  - packages/converge-studio/next.config.mjs
  - packages/converge-studio/tsconfig.json
checks:
  - id: next-config-exists
    description: next.config.mjs exists
    cmd: "test -f packages/converge-studio/next.config.mjs"
  - id: transpile-packages
    description: next.config.mjs transpiles workspace packages
    cmd: "grep -q '@converge/core' packages/converge-studio/next.config.mjs && grep -q 'transpilePackages' packages/converge-studio/next.config.mjs"
  - id: next-intl-plugin-wired
    description: next.config.mjs wraps the export with next-intl/plugin
    cmd: "grep -q 'next-intl/plugin' packages/converge-studio/next.config.mjs && grep -q \"./src/i18n/request\" packages/converge-studio/next.config.mjs"
  - id: layout-deps-declared
    description: next-intl and next-themes are declared in package.json (layout.tsx imports both)
    cmd: "node -e \"const p=require('./packages/converge-studio/package.json');const d={...p.dependencies,...p.devDependencies};process.exit(d['next-intl']&&d['next-themes']?0:1)\""
  - id: dev-script-runs
    description: studio typechecks (proxy for build readiness)
    cmd: "pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
  - id: dev-server-200-on-root
    description: pnpm dev boots within 30s and / returns 200
    cmd: "bash -c 'cd packages/converge-studio && (pnpm dev > /tmp/converge-studio-dev.log 2>&1 &); pid=$!; for i in $(seq 1 30); do sleep 1; code=$(curl -s -o /dev/null -w \"%{http_code}\" http://localhost:4000/ || echo 000); if [ \"$code\" = \"200\" ]; then kill $pid 2>/dev/null; exit 0; fi; done; kill $pid 2>/dev/null; cat /tmp/converge-studio-dev.log; exit 1'"
---

Final package configuration tying together everything from Phases 01-05. The dev server must boot cleanly — typechecking alone does not catch missing runtime dependencies (we learned this when `next-intl` / `next-themes` slipped in via `layout.tsx` without being declared).

**`next.config.mjs`**:

```js
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import createNextIntlPlugin from 'next-intl/plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl({
  transpilePackages: ['@converge/core', '@converge/project-root'],
  outputFileTracingRoot: path.join(__dirname, '../..'),
  serverExternalPackages: ['chokidar'],
  // Disable image optimization in dev/local; we don't need it for an internal tool
  images: { unoptimized: true },
});
```

(Next 15 promoted `experimental.serverComponentsExternalPackages` to top-level `serverExternalPackages`. Use the new name.)

**`tsconfig.json`** — extend the workspace base if one exists, ensure:

```jsonc
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "target": "ES2022",
    "jsx": "preserve",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src/**/*", "next-env.d.ts"]
}
```

**`package.json`** — required runtime dependencies:
- `@converge/core` (workspace)
- `@converge/project-root` (workspace)
- `@monaco-editor/react`
- `chokidar`
- `gray-matter`
- `next` ≥ 15
- `next-intl` ≥ 4 — needed by `src/app/layout.tsx` and `src/i18n/request.ts`. Not optional even if a slim layout temporarily stops using the client provider, because the i18n message catalog under `messages/` and the SSR `getLocale()` call still rely on it.
- `next-themes` ≥ 0.4 — needed by `src/app/layout.tsx`'s `ThemeProvider`.
- `react`, `react-dom` ≥ 18
- `uuid`, `yaml`, `zod`

**Process**:
1. Write `next.config.mjs` (wrap with `next-intl/plugin`).
2. Verify/adjust `tsconfig.json`.
3. **Walk every non-relative import in `src/app/layout.tsx` and `src/app/page.tsx` (and the components they pull in transitively)** and confirm each one resolves to a declared dependency in `package.json`. If `pnpm --filter @converge/studio exec node -e "require.resolve('<pkg>')"` throws, add the package to `dependencies`.
4. `pnpm install`.
5. `pnpm --filter @converge/studio dev` and `curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/` — must be `200` within 30 s. If it isn't, the dev log is the source of truth for what's missing — fix and repeat.
6. `pnpm --filter @converge/studio build`. Fix any remaining type/import errors.

The new `dev-server-200-on-root` check enforces step 5 in a runnable way.
