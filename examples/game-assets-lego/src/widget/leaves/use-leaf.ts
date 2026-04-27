// UseEntity — embed a low-level Entity inside the widget tree.
//
// For widget-to-widget composition, just place the child widget directly in
// a Stack3D. UseEntity is for the case where you have a built Entity (from
// an external module, the legacy entity API, or a cross-project import) and
// want to plug it in.

import { Use } from '../../entity/behaviors/use.js';
import type { Behavior, Entity } from '../../entity/types.js';
import type { BoneRef } from '../../rig.js';
import { LeafWidget3D, type BuildContext } from '../types.js';

export class UseEntity<P extends Record<string, unknown> = Record<string, never>> extends LeafWidget3D {
  private readonly child: Entity<P>;
  private readonly o: {
    props?: Partial<P>;
    at?: [number, number, number];
    rot?: [number, number, number];
    scale?: number | [number, number, number];
    attachTo?: BoneRef;
  };
  constructor(child: Entity<P>, opts: {
    props?: Partial<P>;
    at?: [number, number, number];
    rot?: [number, number, number];
    scale?: number | [number, number, number];
    attachTo?: BoneRef;
    key?: string;
  } = {}) {
    super({ key: opts.key });
    this.child = child;
    this.o = opts;
  }
  override buildBehaviors(_ctx: BuildContext): Behavior[] {
    const u = Use(this.child, { props: this.o.props });
    if (this.o.at) u.at(...this.o.at);
    if (this.o.rot) u.rot(...this.o.rot);
    if (this.o.scale != null) u.scale(this.o.scale);
    if (this.o.attachTo !== undefined) u.attach(this.o.attachTo);
    return [u];
  }
}
