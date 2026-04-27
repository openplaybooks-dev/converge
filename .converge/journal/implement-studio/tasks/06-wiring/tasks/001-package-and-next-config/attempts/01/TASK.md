# Task: 06-wiring/001-package-and-next-config

Final package configuration tying together everything from Phases 01-05.

**`next.config.mjs`**:

```js
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  transpilePackages: ['@converge/core', '@converge/project-root'],
  outputFileTracingRoot: path.join(__dirname, '../..'),
  experimental: {
    serverComponentsExternalPackages: ['chokidar'],
  },
  // Disable image optimization in dev/local; we don't need it for an internal tool
  images: { unoptimized: true },
};
```

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

**`package.json`** — verify final state from 01-vendor/002 (no further changes expected unless missing dev deps surface during build).

**Process**:
1. Write `next.config.mjs`.
2. Verify/adjust `tsconfig.json`.
3. `pnpm install` then `pnpm --filter @converge/studio build`.
4. Fix any remaining type/import errors surfaced by the build.