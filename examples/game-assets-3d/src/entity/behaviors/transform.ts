// Transform — entity-root mutator. Runs in pass 3 (after all geometry +
// material), so it sees the final root and applies position/rotation/scale to
// the entity's group itself, not to per-mesh transforms (which are set on
// individual Mesh.* behaviors).

import type { Behavior } from '../types.js';

export interface TransformOpts {
  at?: [number, number, number];
  rot?: [number, number, number];
  scale?: number | [number, number, number];
}

export function Transform(opts: TransformOpts): Behavior<TransformOpts> {
  return {
    kind: 'transform',
    config: opts,
    onBuild() {
      return {
        applyToRoot(root) {
          if (opts.at) root.position.set(...opts.at);
          if (opts.rot) root.rotation.set(...opts.rot);
          if (opts.scale != null) {
            if (typeof opts.scale === 'number') root.scale.setScalar(opts.scale);
            else root.scale.set(...opts.scale);
          }
        },
      };
    },
  };
}
