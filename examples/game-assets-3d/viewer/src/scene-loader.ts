// Slug → scene module resolver. Glob the scenes/ folder. Each scene file
// exports default an AssetModule (same shape as catalog assets) so the same
// runtime contract works.

import type { AssetModule } from '../../src/types.js';

const modules = import.meta.glob<{ default: AssetModule }>(
  '../../scenes/**/*.ts',
  { eager: true },
);

const bySlug = new Map<string, AssetModule>();
for (const [path, esModule] of Object.entries(modules)) {
  const m = path.match(/\/([^/]+)\.ts$/);
  if (m && esModule.default) bySlug.set(m[1], esModule.default);
}

export function getScene(slug: string): AssetModule | undefined {
  return bySlug.get(slug);
}

export function listScenes(): Array<{ slug: string; meta?: AssetModule['meta'] }> {
  return [...bySlug.entries()].map(([slug, mod]) => ({ slug, meta: mod.meta }));
}
