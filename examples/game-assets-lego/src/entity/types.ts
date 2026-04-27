// Core types for the entity/behavior authoring API.
//
// An Entity is a slug + ordered list of Behaviors. Each Behavior is plain data
// with a few optional hooks. Building an Entity walks its behaviors through a
// three-pass algorithm (geometry → material → root transform) and produces a
// THREE.Object3D with userData.tells / userData.tick stamped on it — the same
// contract the existing viewer reads.

import type * as THREE from 'three';
import type { AssetMeta, Tell, Tick } from '../types.js';

/**
 * What a behavior contributes during one onBuild call. Anything `undefined`
 * means "I produce nothing here". Multiple behaviors compose by appending.
 */
export interface BehaviorContribution {
  /** A 3D object (or array) appended to the entity's root group during pass 1. */
  object?: THREE.Object3D | THREE.Object3D[];
  /** Tells appended to the root's userData.tells. */
  tells?: Tell[];
  /** Ticks composed into the root's userData.tick. */
  ticks?: Tick[];
  /** Named handles other behaviors in the same entity can resolve via ctx.refs. */
  refs?: Record<string, unknown>;
  /** Pass-3: pure root mutator (used by Transform). Runs after all geometry exists. */
  applyToRoot?: (root: THREE.Object3D) => void;
  /** Pass-2: material override on already-built meshes (used by Material). */
  applyMaterial?: (root: THREE.Object3D) => void;
}

/**
 * Mutable scratch shared across behaviors during one .build() call.
 * Behaviors push to tells/ticks and read/write refs.
 */
export interface BuildCtx {
  readonly root: THREE.Group;
  readonly props: Readonly<Record<string, unknown>>;
  readonly refs: Map<string, unknown>;
  readonly tells: Tell[];
  readonly ticks: Tick[];
  readonly depth: number;
  /** Read a proportion with a typed fallback. */
  prop<T>(key: string, fallback: T): T;
}

/**
 * A Behavior is a plain object. The discriminator `kind` is for debugging /
 * verifier introspection; not used for dispatch.
 */
export interface Behavior<C = unknown> {
  readonly kind: string;
  readonly config: C;
  /** Called once when added to an entity. May mutate the entity (rare; e.g. Proportions). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAttach?(entity: Entity<any>): void;
  /** Materialize this behavior's contribution. Called during entity.build(). */
  onBuild?(ctx: BuildCtx): BehaviorContribution | void;
  /** Custom clone hook. Default is structural shallow-copy of the config. */
  onClone?(): Behavior<C>;
}

/** Build output. The verifier reads userData.tells / userData.tick from `object`. */
export interface BuildResult {
  object: THREE.Group;
  tells: Tell[];
  tick?: Tick;
  refs: Map<string, unknown>;
}

/** Public Entity surface. */
export interface Entity<P extends Record<string, unknown> = Record<string, never>> {
  readonly slug: string;
  readonly meta: AssetMeta;
  readonly behaviors: ReadonlyArray<Behavior>;
  readonly defaultProps: Readonly<P>;
  /** Append a behavior. Mutates and returns `this`. Order matters. */
  add(b: Behavior): this;
  /** Deep clone via per-behavior onClone (default: structural). Slug preserved unless renamed. */
  clone(opts?: { slug?: string }): Entity<P>;
  /** Build into a THREE.Group with verifier-compatible userData. */
  build(props?: Partial<P>): BuildResult;
}
