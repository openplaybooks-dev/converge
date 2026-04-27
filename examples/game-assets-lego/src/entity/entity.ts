// entity() factory + EntityImpl. The Entity is a mutable builder with explicit
// clone() — matches the user's `house.clone().add(...)` example without the
// per-add allocation cost an immutable design would have.

import type { AssetMeta } from '../types.js';
import type { Behavior, BuildResult, Entity } from './types.js';
import { structuralCloneBehavior } from './clone.js';
import { runBuild } from './build.js';

export class EntityImpl<P extends Record<string, unknown>> implements Entity<P> {
  readonly slug: string;
  readonly meta: AssetMeta;
  private _behaviors: Behavior[] = [];
  private _defaults: Partial<P> = {};

  constructor(slug: string, meta: AssetMeta) {
    this.slug = slug;
    this.meta = meta;
  }

  get behaviors(): ReadonlyArray<Behavior> {
    return this._behaviors;
  }
  get defaultProps(): Readonly<P> {
    return Object.freeze({ ...this._defaults }) as Readonly<P>;
  }

  add(b: Behavior): this {
    b.onAttach?.(this);
    this._behaviors.push(b);
    return this;
  }

  /** Used by the Proportions behavior to merge its defaults into the entity. */
  mergeDefaultProps(p: Partial<P>): void {
    Object.assign(this._defaults, p);
  }

  clone(opts: { slug?: string } = {}): Entity<P> {
    const newSlug = opts.slug ?? this.slug;
    const fresh = new EntityImpl<P>(newSlug, { ...this.meta, slug: newSlug });
    fresh._defaults = { ...this._defaults };
    fresh._behaviors = this._behaviors.map((b) =>
      b.onClone ? b.onClone() : structuralCloneBehavior(b),
    );
    return fresh;
  }

  build(propOverrides?: Partial<P>): BuildResult {
    return runBuild(this, propOverrides);
  }
}

export function entity<P extends Record<string, unknown> = Record<string, never>>(
  slug: string,
  meta?: Partial<Omit<AssetMeta, 'slug'>>,
): EntityImpl<P> {
  return new EntityImpl<P>(slug, { kind: 'prop', ...meta, slug });
}
