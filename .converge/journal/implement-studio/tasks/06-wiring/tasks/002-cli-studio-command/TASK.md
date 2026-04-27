---
id: 002-cli-studio-command
title: "Add `converge studio` CLI subcommand"
dependencies:
  - 001-package-and-next-config
outputs:
  - packages/cli/src/commands-studio.ts
  - packages/cli/src/main.ts
  - packages/cli/package.json
checks:
  - id: command-file-exists
    description: commands-studio.ts exists
    cmd: "test -f packages/cli/src/commands-studio.ts"
  - id: registered-in-main
    description: main.ts references commands-studio
    cmd: "grep -q 'commands-studio\\|runStudio' packages/cli/src/main.ts"
  - id: optional-dep-on-studio
    description: cli has optionalDependency on @converge/studio
    cmd: "node -e \"const p=require('./packages/cli/package.json');process.exit(p.optionalDependencies&&p.optionalDependencies['@converge/studio']?0:1)\""
  - id: studio-help
    description: "`converge studio --help` runs and mentions studio"
    cmd: "pnpm --filter @converge/cli build 2>&1 | tail -3 && node packages/cli/dist/index.js studio --help 2>&1 | grep -qi studio"
---

Add a `converge studio` subcommand that launches the studio against the user's converge project.

**`packages/cli/src/commands-studio.ts`**:

```ts
import { spawn } from 'node:child_process';
import * as path from 'node:path';
import { findConvergeRoot } from '@converge/project-root';
import { createRequire } from 'node:module';

interface StudioOptions {
  dev?: boolean;
  port?: number;
  host?: string;  // default 127.0.0.1
}

export async function runStudio(opts: StudioOptions = {}): Promise<number> {
  const projectRoot = findConvergeRoot(process.cwd());
  if (!projectRoot) {
    console.error('No .converge/ directory found. Run `converge init` first.');
    return 1;
  }

  // Resolve @converge/studio package directory
  let studioDir: string;
  try {
    const req = createRequire(import.meta.url);
    const pkgPath = req.resolve('@converge/studio/package.json');
    studioDir = path.dirname(pkgPath);
  } catch {
    console.error('@converge/studio is not installed. From the converge repo: `pnpm install`.');
    return 1;
  }

  if (opts.host && opts.host !== '127.0.0.1' && opts.host !== 'localhost') {
    console.warn(`Warning: binding studio to ${opts.host} — no auth in MVP. Anyone with network access can read/edit your project.`);
  }

  const port = String(opts.port ?? process.env.PORT ?? 4000);
  const host = opts.host ?? '127.0.0.1';
  const cmd = opts.dev ? 'dev' : 'start';

  const child = spawn('pnpm', ['exec', 'next', cmd, '-p', port, '-H', host], {
    cwd: studioDir,
    env: { ...process.env, CONVERGE_PROJECT_ROOT: projectRoot, PORT: port },
    stdio: 'inherit',
  });

  return new Promise((resolve) => child.on('exit', (code) => resolve(code ?? 0)));
}
```

**Wire into `packages/cli/src/main.ts`**: register the subcommand using whatever CLI framework `main.ts` already uses (look for the registration pattern from existing `run`/`init`/`status`/`plan` commands). Accept flags `--dev`, `--port <n>`, `--host <h>`.

**`packages/cli/package.json`**: add `@converge/studio` to `optionalDependencies`:

```jsonc
{
  "optionalDependencies": {
    "@converge/studio": "workspace:*"
  }
}
```

This way the CLI builds even in environments where the studio is not built; the runStudio command catches the import error and prints a friendly message.

**Process**:
1. Read `packages/cli/src/main.ts` to learn the command-registration convention.
2. Implement `commands-studio.ts`.
3. Register in `main.ts`.
4. Update `cli/package.json`.
5. `pnpm --filter @converge/cli build`.
6. Run `node packages/cli/dist/index.js studio --help` to verify.
