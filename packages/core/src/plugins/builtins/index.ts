/**
 * Built-in Plugin Registry
 *
 * Maps plugin names to their bundled implementations.
 * These are always available without npm install.
 *
 * Each builtin lives in its own folder with:
 *   - index.ts   — plugin implementation
 *   - PLUGIN.md  — human-readable descriptor (copied to .converge/plugins/ on init)
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ConvergePlugin } from '../types.ts';
import typescriptPlugin from './typescript/index.ts';
import nextjsPlugin from './nextjs/index.ts';
import gitPlugin from './git/index.ts';
import dockerPlugin from './docker/index.ts';
import eslintPlugin from './eslint/index.ts';
import vitestPlugin from './vitest/index.ts';

const builtins = new Map<string, ConvergePlugin>([
  ['typescript', typescriptPlugin],
  ['nextjs', nextjsPlugin],
  ['git', gitPlugin],
  ['docker', dockerPlugin],
  ['eslint', eslintPlugin],
  ['vitest', vitestPlugin],
]);

/**
 * Get a built-in plugin by name, or undefined if not found.
 */
export function getBuiltinPlugin(name: string): ConvergePlugin | undefined {
  return builtins.get(name);
}

/**
 * List all available built-in plugin names.
 */
export function listBuiltinPlugins(): string[] {
  return Array.from(builtins.keys());
}

/**
 * Get the absolute path to a builtin plugin's folder.
 * Used by init to copy PLUGIN.md + index.ts into the project.
 */
export function getBuiltinPluginDir(name: string): string | undefined {
  if (!builtins.has(name)) return undefined;
  const thisDir = dirname(fileURLToPath(import.meta.url));
  return join(thisDir, name);
}
