// Widget tree — Flutter-style declarative authoring layer atop the entity API.
//
// Three widget categories, modeled on Flutter:
//   - StatelessWidget3D : composite. Implements build(ctx) → Widget3D.
//   - LeafWidget3D      : wraps low-level Behaviors (Mesh.*, Tell.*, Use, etc.).
//                         Implements buildBehaviors(ctx) → Behavior[].
//   - InheritedWidget3D : provides values to descendants via context (next file).
//
// BuildContext flows down the tree at build-time, carrying inherited widgets
// and the parent chain. Authors call `Palette.of(ctx)` / `RigOf(ctx)` to read.
//
// Composition: a widget's children are constructed eagerly (TS doesn't have
// Dart's lazy const-everywhere, so we just construct widgets in build() each
// rebuild). Same as React functional components.

import type { Behavior } from '../entity/types.js';

export interface BuildContext {
  /** Parent widget chain — first entry is the root, last is the immediate parent. */
  readonly path: ReadonlyArray<Widget3D>;
  /** Map of inherited-widget constructor → instance, walking up the path. */
  readonly inherited: ReadonlyMap<symbol, InheritedWidget3D>;
  /** Lookup an inherited widget by its TypeKey symbol. */
  dependOn<T extends InheritedWidget3D>(typeKey: symbol): T | undefined;
}

/**
 * Base widget. Authors don't extend this directly — they extend
 * StatelessWidget3D, LeafWidget3D, or InheritedWidget3D.
 */
export abstract class Widget3D {
  /** Optional key for clarity / future stable-identity needs. Currently unused at runtime. */
  readonly key?: string;

  constructor(opts: { key?: string } = {}) {
    this.key = opts.key;
  }

  /**
   * Lower this widget to a flat Behavior list. The widget tree owns its own
   * recursion: a composite widget builds sub-widgets and concatenates their
   * lowered behaviors. Leaf widgets emit Behaviors directly.
   *
   * The default implementation handles dispatch among the three subtypes; only
   * leaves and inherited widgets override.
   */
  abstract lower(ctx: BuildContext): Behavior[];
}

/**
 * Composite widget. Author implements build(ctx) → Widget3D.
 * The framework recursively lowers the returned subtree.
 */
export abstract class StatelessWidget3D extends Widget3D {
  abstract build(ctx: BuildContext): Widget3D;

  override lower(ctx: BuildContext): Behavior[] {
    const childCtx: BuildContext = {
      ...ctx,
      path: [...ctx.path, this],
    };
    const child = this.build(childCtx);
    return child.lower(childCtx);
  }
}

/**
 * Leaf widget. Wraps one or more low-level Behaviors. Authors implement
 * buildBehaviors(ctx) → Behavior[].
 */
export abstract class LeafWidget3D extends Widget3D {
  abstract buildBehaviors(ctx: BuildContext): Behavior[];

  override lower(ctx: BuildContext): Behavior[] {
    return this.buildBehaviors(ctx);
  }
}

/**
 * InheritedWidget3D — provides values to descendants. Subclasses set a
 * unique `typeKey` symbol so descendants can dependOn() it.
 *
 * Each subclass should expose a static `of(ctx)` helper that calls
 * ctx.dependOn(SubclassName.typeKey).
 */
export abstract class InheritedWidget3D extends Widget3D {
  /** The child widget this inherited widget wraps. */
  readonly child: Widget3D;
  /** The type discriminator each subclass overrides. */
  abstract get typeKey(): symbol;

  constructor(opts: { child: Widget3D; key?: string }) {
    super(opts);
    this.child = opts.child;
  }

  override lower(ctx: BuildContext): Behavior[] {
    const inherited = new Map(ctx.inherited);
    inherited.set(this.typeKey, this);
    const childCtx: BuildContext = {
      path: [...ctx.path, this],
      inherited,
      dependOn: <T extends InheritedWidget3D>(key: symbol): T | undefined =>
        inherited.get(key) as T | undefined,
    };
    return this.child.lower(childCtx);
  }
}

/** Root build context — used at the top of the tree. */
export function makeRootContext(): BuildContext {
  const inherited = new Map<symbol, InheritedWidget3D>();
  return {
    path: [],
    inherited,
    dependOn: <T extends InheritedWidget3D>(key: symbol): T | undefined =>
      inherited.get(key) as T | undefined,
  };
}
