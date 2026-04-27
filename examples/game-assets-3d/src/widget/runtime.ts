// Bridge from the widget tree to the existing entity machinery.
//
//   widgetToEntity(slug, meta, root) → Entity
//   widgetToAssetModule(slug, meta, root) → AssetModule
//
// Internally: lower the root widget once with a fresh BuildContext, take the
// resulting flat Behavior[], wrap it in an Entity by .add()ing each behavior
// in order. The entity's three-pass build still runs as before.

import { entity } from '../entity/entity.js';
import { entityToAssetModule } from '../entity/asset-module.js';
import type { AssetMeta, AssetModule } from '../types.js';
import type { Entity } from '../entity/types.js';
import { makeRootContext, type Widget3D } from './types.js';

export function widgetToEntity(
  slug: string,
  meta: Partial<Omit<AssetMeta, 'slug'>>,
  root: Widget3D,
): Entity {
  const ctx = makeRootContext();
  const behaviors = root.lower(ctx);
  const ent = entity(slug, meta);
  for (const b of behaviors) ent.add(b);
  return ent;
}

export function widgetToAssetModule(
  slug: string,
  meta: Partial<Omit<AssetMeta, 'slug'>>,
  root: Widget3D,
): AssetModule {
  return entityToAssetModule(widgetToEntity(slug, meta, root));
}
