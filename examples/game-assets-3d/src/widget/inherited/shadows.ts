// Shadows — descendant meshes inherit cast/receive defaults from this widget.
// MeshBehavior.onBuild reads `__shadowsConfig` from the BuildContext refs and
// applies the bools to Shape before .build().
//
// Per-mesh override: set MeshCommonOpts.castShadow / receiveShadow explicitly
// on the leaf to opt-in or opt-out for one mesh independently.

import { InheritedWidget3D, type BuildContext, type Widget3D } from '../types.js';

const SHADOWS_TYPE_KEY = Symbol('Shadows');

export class Shadows extends InheritedWidget3D {
  readonly cast: boolean;
  readonly receive: boolean;

  constructor(opts: { cast?: boolean; receive?: boolean; child: Widget3D; key?: string }) {
    super({ child: opts.child, key: opts.key });
    this.cast = opts.cast ?? true;
    this.receive = opts.receive ?? true;
  }

  override get typeKey(): symbol {
    return SHADOWS_TYPE_KEY;
  }

  override lower(ctx: BuildContext): import('../../entity/types.js').Behavior[] {
    // Two-step: parent class registers us in `inherited` so descendants can
    // call Shadows.of(ctx). We additionally need to seed `__shadowsConfig` in
    // the entity-level refs map, which is created later when the runtime
    // builds the entity. The cleanest place is a leaf behavior wrapper that
    // runs at the start of the entity's build, before any Mesh behaviors.
    const seedBehavior: import('../../entity/types.js').Behavior = {
      kind: 'shadows-config',
      config: { cast: this.cast, receive: this.receive },
      onBuild: (innerCtx) => {
        innerCtx.refs.set('__shadowsConfig', { cast: this.cast, receive: this.receive });
        return {};
      },
    };
    // Lower parent (which adds us to `inherited`), then prepend the seed so
    // it runs before any descendant Mesh.
    const childBehaviors = super.lower(ctx);
    return [seedBehavior, ...childBehaviors];
  }

  static of(ctx: BuildContext): Shadows | undefined {
    return ctx.dependOn<Shadows>(SHADOWS_TYPE_KEY);
  }
}
