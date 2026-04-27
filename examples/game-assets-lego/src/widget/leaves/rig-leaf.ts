// Skeleton — leaf widget wrapping a Rig.* behavior. Place this in the tree to
// install a bone hierarchy on the entity. Other widgets (MeshBox.attach,
// HeadTilt) then resolve bones against this rig.

import { Rig } from '../../rig.js';
import type { Behavior } from '../../entity/types.js';
import type { BoneDecl, BoneRole } from '../../rig.js';
import { LeafWidget3D, type BuildContext } from '../types.js';

export type SkeletonKind = 'humanoid' | 'detailed-humanoid' | 'biped' | 'quadruped' | 'empty' | 'custom';

export class Skeleton extends LeafWidget3D {
  private readonly kind: SkeletonKind;
  private readonly customOpts?: {
    bones: BoneDecl[];
    skinned?: boolean;
    attachments?: Partial<Record<BoneRole, string>>;
  };
  constructor(opts: {
    kind: SkeletonKind;
    custom?: { bones: BoneDecl[]; skinned?: boolean; attachments?: Partial<Record<BoneRole, string>> };
    key?: string;
  }) {
    super({ key: opts.key });
    this.kind = opts.kind;
    this.customOpts = opts.custom;
  }

  override buildBehaviors(_ctx: BuildContext): Behavior[] {
    switch (this.kind) {
      case 'humanoid': return [Rig.humanoid()];
      case 'detailed-humanoid': return [Rig.detailedHumanoid()];
      case 'biped': return [Rig.biped()];
      case 'quadruped': return [Rig.quadruped()];
      case 'empty': return [Rig.empty()];
      case 'custom':
        if (!this.customOpts) throw new Error('Skeleton kind=custom requires custom={bones,...}');
        return [Rig.custom(this.customOpts)];
    }
  }
}
