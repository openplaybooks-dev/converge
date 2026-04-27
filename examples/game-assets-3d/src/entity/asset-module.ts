// Bridge from Entity to AssetModule — so entity-based catalog files plug into
// the existing viewer loader (which calls mod.default(parent, three, options)).

import type * as THREE from 'three';
import type { AssetBuilder, AssetModule, AssetBuildOptions } from '../types.js';
import type { Entity } from './types.js';

export function entityToAssetModule<P extends Record<string, unknown>>(
  ent: Entity<P>,
): AssetModule {
  const builder: AssetBuilder = (
    parent: THREE.Object3D,
    _three: typeof THREE,
    options?: AssetBuildOptions,
  ) => {
    const result = ent.build();
    if (options?.position) result.object.position.fromArray(options.position);
    if (options?.scale != null) result.object.scale.setScalar(options.scale);
    parent.add(result.object);
    return result.object;
  };
  return { default: builder, meta: ent.meta };
}
