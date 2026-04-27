// The build algorithm — three passes over an entity's behaviors.
//
// Pass 1 (geometry):  run onBuild in declaration order. Append c.object to the
//                     root group, push c.tells / c.ticks / c.refs. Collect any
//                     deferred applyMaterial / applyToRoot fns.
// Pass 2 (material):  run all collected applyMaterial(root) — needs all meshes.
// Pass 3 (transform): run all collected applyToRoot(root) — last, root-level.
//
// Then stamp the verifier-compatible userData on the root and return.

import * as THREE from 'three';
import type { Tell, Tick } from '../types.js';
import type { BuildCtx, BuildResult } from './types.js';
import type { EntityImpl } from './entity.js';

export function runBuild<P extends Record<string, unknown>>(
  entity: EntityImpl<P>,
  propOverrides?: Partial<P>,
  depth = 0,
): BuildResult {
  const root = new THREE.Group();
  root.name = entity.slug;

  const props = Object.freeze({ ...entity.defaultProps, ...propOverrides });
  const refs = new Map<string, unknown>();
  const tells: Tell[] = [];
  const ticks: Tick[] = [];

  const ctx: BuildCtx = {
    root,
    props,
    refs,
    tells,
    ticks,
    depth,
    prop<T>(key: string, fb: T): T {
      return key in props ? ((props as Record<string, unknown>)[key] as T) : fb;
    },
  };

  // PASS 1 — geometry-producing behaviors run in declaration order.
  const deferredRoot: Array<(r: THREE.Object3D) => void> = [];
  const deferredMaterial: Array<(r: THREE.Object3D) => void> = [];

  for (const b of entity.behaviors) {
    const c = b.onBuild?.(ctx);
    if (!c) continue;
    if (c.object) {
      if (Array.isArray(c.object)) for (const o of c.object) root.add(o);
      else root.add(c.object);
    }
    if (c.tells) tells.push(...c.tells);
    if (c.ticks) ticks.push(...c.ticks);
    if (c.refs) for (const [k, v] of Object.entries(c.refs)) refs.set(k, v);
    if (c.applyToRoot) deferredRoot.push(c.applyToRoot);
    if (c.applyMaterial) deferredMaterial.push(c.applyMaterial);
  }

  // PASS 2 — material overrides (need all meshes present).
  for (const fn of deferredMaterial) fn(root);

  // PASS 3 — root transforms (need final root contents present).
  for (const fn of deferredRoot) fn(root);

  // Stamp verifier-compatible userData.
  root.userData.tells = tells;
  root.userData.entitySlug = entity.slug;
  let composedTick: Tick | undefined;
  if (ticks.length > 0) {
    const captured = ticks;
    composedTick = (t: number, dt: number) => {
      for (const fn of captured) fn(t, dt);
    };
    root.userData.tick = composedTick;
    root.userData.tickRegistry = ticks.length;
  }

  return { object: root, tells, tick: composedTick, refs };
}
