// Stack3D — multi-child container. Mirrors Flutter's Stack: children are laid
// out at their own positions (each child positions itself via at/rot props on
// its own widget). The Stack itself is a LeafWidget3D that emits one Group
// behavior containing all children's behaviors.
//
// For tree-level grouping with no transform, children can also be passed
// directly to a parent's build() in any order — Stack3D is the explicit form
// when you want a named group with optional transform.

import { Group } from '../entity/behaviors/group.js';
import type { Behavior } from '../entity/types.js';
import { LeafWidget3D, type BuildContext, type Widget3D } from './types.js';

export interface Stack3DOpts {
  children: Widget3D[];
  name?: string;
  at?: [number, number, number];
  rot?: [number, number, number];
  scale?: number | [number, number, number];
  key?: string;
}

export class Stack3D extends LeafWidget3D {
  readonly children: Widget3D[];
  readonly name?: string;
  readonly at?: [number, number, number];
  readonly rot?: [number, number, number];
  readonly scale?: number | [number, number, number];

  constructor(opts: Stack3DOpts) {
    super({ key: opts.key });
    this.children = opts.children;
    this.name = opts.name;
    this.at = opts.at;
    this.rot = opts.rot;
    this.scale = opts.scale;
  }

  override buildBehaviors(ctx: BuildContext): Behavior[] {
    // Lower each child to its own behavior list, then wrap the lot in a
    // Group behavior so the whole subtree shares one Object3D group with the
    // requested name + transform.
    const childCtx: BuildContext = { ...ctx, path: [...ctx.path, this] };
    const childBehaviors: Behavior[] = [];
    for (const child of this.children) {
      childBehaviors.push(...child.lower(childCtx));
    }
    const scale = this.scale;
    return [{
      kind: 'stack3d',
      config: { name: this.name, at: this.at, rot: this.rot, scale },
      onBuild: (innerCtx) => {
        const group = Group(...childBehaviors);
        if (this.name) group.named(this.name);
        if (this.at) group.at(...this.at);
        if (this.rot) group.rot(...this.rot);
        const groupContrib = group.onBuild!(innerCtx);
        if (!groupContrib) return {};
        // Apply scale on the resulting Object3D after Group built it.
        if (scale != null && groupContrib.object && !Array.isArray(groupContrib.object)) {
          if (typeof scale === 'number') groupContrib.object.scale.setScalar(scale);
          else groupContrib.object.scale.set(...scale);
        }
        return groupContrib;
      },
    }];
  }
}
