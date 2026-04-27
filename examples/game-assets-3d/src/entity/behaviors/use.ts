// Use(child, opts) — first-class sub-asset embedding.
//
// Builds the child entity at parent build time and parents the resulting root
// under the parent's entity (or under a specific bone via attachTo). Hoists
// the child's tells into the parent's userData.tells, and the child's
// composed tick into the parent's tick chain — so a "forest" entity that
// uses two trees has 2× the tells and ticks both trees on the parent root.

import type { Behavior, BuildCtx, Entity } from '../types.js';
import type { BoneRef } from '../../rig.js';

export interface UseConfig<P extends Record<string, unknown> = Record<string, unknown>> {
  child: Entity<P>;
  propsOverride?: Partial<P>;
  at?: [number, number, number];
  rot?: [number, number, number];
  scale?: number | [number, number, number];
  attachTo?: BoneRef;
}

export interface UseBehavior<P extends Record<string, unknown> = Record<string, unknown>>
  extends Behavior<UseConfig<P>> {
  kind: 'use';
  at(x: number, y: number, z: number): UseBehavior<P>;
  rot(x: number, y: number, z: number): UseBehavior<P>;
  scale(s: number | [number, number, number]): UseBehavior<P>;
  withProps(props: Partial<P>): UseBehavior<P>;
  attach(boneRef: BoneRef): UseBehavior<P>;
}

export function Use<P extends Record<string, unknown>>(
  child: Entity<P>,
  init: { props?: Partial<P> } = {},
): UseBehavior<P> {
  const config: UseConfig<P> = { child, propsOverride: init.props };

  const b: UseBehavior<P> = {
    kind: 'use',
    config,
    at(x, y, z) { config.at = [x, y, z]; return b; },
    rot(x, y, z) { config.rot = [x, y, z]; return b; },
    scale(s) { config.scale = s; return b; },
    withProps(p) { config.propsOverride = { ...config.propsOverride, ...p }; return b; },
    attach(boneRef) { config.attachTo = boneRef; return b; },

    onBuild(ctx: BuildCtx) {
      const sub = config.child.build(config.propsOverride);

      if (config.at) sub.object.position.set(...config.at);
      if (config.rot) sub.object.rotation.set(...config.rot);
      if (config.scale != null) {
        if (typeof config.scale === 'number') sub.object.scale.setScalar(config.scale);
        else sub.object.scale.set(...config.scale);
      }

      // Namespace child refs under the slug so `forest.refs.get('tree-pine.trunk')`
      // works without colliding with the parent's own refs.
      const childRefs: Record<string, unknown> = {};
      sub.refs.forEach((v, k) => {
        childRefs[`${config.child.slug}.${k}`] = v;
      });

      // Resolve attachment target (bone vs. entity root).
      if (config.attachTo !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rig = ctx.refs.get('rig') as any;
        if (rig) {
          rig.resolve(config.attachTo).add(sub.object);
          return {
            tells: sub.tells,
            ticks: sub.tick ? [sub.tick] : [],
            refs: childRefs,
          };
        }
        console.warn(
          `[entity] Use(${config.child.slug}).attach(${String(config.attachTo)}) on parent without a Rig — ` +
            `attaching under entity root instead.`,
        );
      }

      return {
        object: sub.object,
        tells: sub.tells,
        ticks: sub.tick ? [sub.tick] : [],
        refs: childRefs,
      };
    },

    onClone() {
      const cloned = Use(config.child.clone(), { props: config.propsOverride });
      if (config.at) cloned.at(...config.at);
      if (config.rot) cloned.rot(...config.rot);
      if (config.scale != null) cloned.scale(config.scale);
      if (config.attachTo !== undefined) cloned.attach(config.attachTo);
      return cloned;
    },
  };
  return b;
}
