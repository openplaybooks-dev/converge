---
id: 003-next-config-workspace
title: Configure next.config.mjs to transpile workspace packages
outputs:
  - packages/studio/next.config.mjs
checks:
  - id: next-config-exists
    description: next.config.mjs exists
    cmd: "test -f packages/studio/next.config.mjs"
  - id: transpile-packages
    description: next.config.mjs declares transpilePackages with @converge/core
    cmd: "grep -q 'transpilePackages' packages/studio/next.config.mjs && grep -q '@converge/core' packages/studio/next.config.mjs"
---

The MC fork ships its own `next.config.js`. Replace or augment to transpile the converge workspace packages. Write or update `packages/studio/next.config.mjs`:

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
  images: { unoptimized: true },
});
```

If the upstream had `next.config.js` (not `.mjs`), prefer the new `.mjs`. Delete `next.config.js` to avoid Next picking the wrong one.

If the upstream uses different next-intl wiring (different filename), adapt — the `next-intl/plugin` import is what matters.
