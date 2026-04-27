// Proportions — declares typed default parameters on an entity.
//
// Runs at attach time (not build time). The defaults merge into the entity's
// defaultProps. Other behaviors read them via ctx.prop(key, fallback) during
// build, with .build({ overrides }) overriding for that build only.

import type { Behavior } from '../types.js';
import type { EntityImpl } from '../entity.js';

export function Proportions<P extends Record<string, unknown>>(defaults: P): Behavior<P> {
  return {
    kind: 'proportions',
    config: defaults,
    onAttach(entity) {
      (entity as EntityImpl<P>).mergeDefaultProps(defaults);
    },
  };
}
