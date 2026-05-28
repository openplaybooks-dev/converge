import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

let _override = '';
let _autoResolved: string | null = null;

function findConvergeRoot(start: string): string {
  let dir = resolve(start);
  while (true) {
    if (existsSync(resolve(dir, '.converge'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return '';
    dir = parent;
  }
}

export function getProjectDir(): string {
  if (_override) return _override;
  if (process.env.CONVERGE_PROJECT_DIR) return process.env.CONVERGE_PROJECT_DIR;
  if (_autoResolved === null) _autoResolved = findConvergeRoot(process.cwd());
  return _autoResolved;
}

export function setProjectDir(dir: string): void {
  _override = dir;
  process.env.CONVERGE_PROJECT_DIR = dir;
}

/**
 * Resolve the project directory for an API request.
 *
 * Priority:
 *   1. `X-Converge-Workspace` request header (client-driven, per-request)
 *   2. Server-side singleton / `CONVERGE_PROJECT_DIR` env var (fallback)
 *
 * This lets multiple browser tabs target different workspaces without any
 * server state; each request carries its workspace context.
 */
export function resolveProjectDir(request: Request): string {
  const header = request.headers.get('x-converge-workspace');
  if (header && header.trim()) return header.trim();
  return getProjectDir();
}
