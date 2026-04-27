// Group(...children) — sub-Object3D with its own transform.
//
// Children can be entities or behaviors. Sub-entities build with their own
// build() (their userData.tells/tick fire on viewer traversal). Inline
// behaviors run with the same parent BuildCtx and contribute to the parent's
// tells/ticks/refs.

import * as THREE from 'three';
import type { Tell, Tick } from '../../types.js';
import type { Behavior, BuildCtx, Entity } from '../types.js';

export interface GroupBehavior extends Behavior<{
  children: Array<Entity | Behavior>;
  name?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
}> {
  kind: 'group';
  at(x: number, y: number, z: number): GroupBehavior;
  rot(x: number, y: number, z: number): GroupBehavior;
  named(name: string): GroupBehavior;
}

function isEntity(x: Entity | Behavior): x is Entity {
  return 'behaviors' in x && 'build' in x;
}

export function Group(...children: Array<Entity | Behavior>): GroupBehavior {
  const config: GroupBehavior['config'] = { children: [...children] };

  const b: GroupBehavior = {
    kind: 'group',
    config,
    at(x, y, z) { config.position = [x, y, z]; return b; },
    rot(x, y, z) { config.rotation = [x, y, z]; return b; },
    named(name) { config.name = name; return b; },

    onBuild(ctx: BuildCtx) {
      const subRoot = new THREE.Group();
      if (config.name) subRoot.name = config.name;
      const subTells: Tell[] = [];
      const subTicks: Tick[] = [];

      for (const child of config.children) {
        if (isEntity(child)) {
          // Sub-entity — its own build, its own userData.tick (viewer tickles it).
          const sub = child.build();
          subRoot.add(sub.object);
          subTells.push(...sub.tells);
          if (sub.tick) subTicks.push(sub.tick);
        } else {
          // Inline behavior — same ctx, contributions roll up into this Group.
          const c = child.onBuild?.(ctx);
          if (!c) continue;
          if (c.object) {
            if (Array.isArray(c.object)) for (const o of c.object) subRoot.add(o);
            else subRoot.add(c.object);
          }
          if (c.tells) subTells.push(...c.tells);
          if (c.ticks) subTicks.push(...c.ticks);
          if (c.refs) for (const [k, v] of Object.entries(c.refs)) ctx.refs.set(k, v);
        }
      }

      if (config.position) subRoot.position.set(...config.position);
      if (config.rotation) subRoot.rotation.set(...config.rotation);

      // Register named groups in ctx.refs so Animator.spin({target: name}) etc.
      // can resolve them at build time. Tagged meshes use the same map.
      if (config.name) ctx.refs.set(config.name, subRoot);

      return { object: subRoot, tells: subTells, ticks: subTicks };
    },

    onClone() {
      const cloned = Group(
        ...config.children.map((ch) =>
          isEntity(ch) ? ch.clone() : (ch.onClone?.() ?? ch),
        ),
      );
      if (config.position) cloned.at(...config.position);
      if (config.rotation) cloned.rot(...config.rotation);
      if (config.name) cloned.named(config.name);
      return cloned;
    },
  };

  return b;
}
