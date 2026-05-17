import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/**
 * Project root = nearest ancestor (or self) containing `.converge/`.
 * Returns null if no such ancestor exists.
 */
export function findConvergeRoot(startDir: string): string | null {
  let dir = resolve(startDir);
  while (true) {
    if (existsSync(join(dir, ".converge"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}
