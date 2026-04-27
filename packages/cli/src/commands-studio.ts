import { spawn } from 'node:child_process';
import * as path from 'node:path';
import { findConvergeRoot } from '@converge/project-root';
import { createRequire } from 'node:module';

interface StudioOptions {
  dev?: boolean;
  port?: number;
  host?: string;
}

export async function studioCommand(
  opts: StudioOptions = {},
  verbose?: boolean,
): Promise<void> {
  const projectRoot = findConvergeRoot(process.cwd());
  if (!projectRoot) {
    console.error('No .converge/ directory found. Run `converge init` first.');
    process.exit(1);
  }

  let studioDir: string;
  try {
    const req = createRequire(import.meta.url);
    const pkgPath = req.resolve('@converge/studio/package.json');
    studioDir = path.dirname(pkgPath);
  } catch {
    console.error('@converge/studio is not installed. From the converge repo: `pnpm install`.');
    process.exit(1);
  }

  if (opts.host && opts.host !== '127.0.0.1' && opts.host !== 'localhost') {
    console.warn(`Warning: binding studio to ${opts.host} — no auth in MVP. Anyone with network access can read/edit your project.`);
  }

  const port = String(opts.port ?? process.env.PORT ?? 4000);
  const host = opts.host ?? '127.0.0.1';
  const cmd = opts.dev ? 'dev' : 'start';

  if (verbose) {
    console.log(`Starting studio on ${host}:${port} (${cmd})`);
  }

  const child = spawn('pnpm', ['exec', 'next', cmd, '-p', port, '-H', host], {
    cwd: studioDir,
    env: { ...process.env, CONVERGE_PROJECT_ROOT: projectRoot, PORT: port },
    stdio: 'inherit',
  });

  child.on('exit', (code) => process.exit(code ?? 0));
}

export interface StudioOptionsInput {
  dev?: boolean;
  port?: number;
  host?: string;
  v?: boolean;
  verbose?: boolean;
}