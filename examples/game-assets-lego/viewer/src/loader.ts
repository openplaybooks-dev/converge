// Slug → catalog module resolver. Uses Vite's `import.meta.glob` to find
// every `catalog/<group>/<slug>.ts` file at build time and key them by slug.
//
// Two module shapes are supported:
//   - Single asset: `export default someAssetModule` (the original).
//   - Manifest:     `export default [assetModuleA, assetModuleB, ...]` for
//                   groups that programmatically register many slugs from one
//                   source-of-truth file (dungeon, hexagon, furniture packs).

import type { AssetModule } from '../../src/types.js';

const modules = import.meta.glob<{ default: AssetModule | AssetModule[] }>(
  '../../catalog/**/*.ts',
  { eager: true },
);

const bySlug = new Map<string, AssetModule>();
for (const [path, esModule] of Object.entries(modules)) {
  const exp = esModule.default;
  if (!exp) continue;
  const list = Array.isArray(exp) ? exp : [exp];
  for (const mod of list) {
    const slug = mod.meta?.slug;
    if (!slug) {
      // Fallback: derive slug from filename for single-asset modules that
      // forgot to set meta.slug.
      const m = path.match(/\/([^/]+)\.ts$/);
      if (m) bySlug.set(m[1], mod);
      continue;
    }
    bySlug.set(slug, mod);
  }
}

export function getAsset(slug: string): AssetModule | undefined {
  return bySlug.get(slug);
}

export function listAssets(): Array<{ slug: string; meta?: AssetModule['meta'] }> {
  return [...bySlug.entries()].map(([slug, mod]) => ({ slug, meta: mod.meta }));
}
