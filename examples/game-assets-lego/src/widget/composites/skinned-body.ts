// SkinnedBody — one continuous THREE.SkinnedMesh humanoid body bound to the
// detailed humanoid rig. Vertices near joints have weights split between the
// two adjacent bones, so the mesh deforms smoothly when bones rotate (instead
// of pivoting at a sharp angle like the parts-mode body).

import * as THREE from 'three';
import { LeafWidget3D, type BuildContext } from '../types.js';
import { Palette } from '../inherited/palette.js';
import type { Behavior } from '../../entity/types.js';
import type { ResolvedRig } from '../../rig.js';
import type { ColorInput } from '../../style.js';
import { makeMaterial } from '../../materials.js';
import {
  generateSkinnedHumanoidGeometry,
  type BodyProfileParams,
} from './skinned-body-generator.js';

export interface SkinnedBodyOpts extends BodyProfileParams {
  skinColor?: ColorInput;
  castShadow?: boolean;
  receiveShadow?: boolean;
  tag?: string;
  key?: string;
}

export class SkinnedBody extends LeafWidget3D {
  private readonly opts: SkinnedBodyOpts;
  constructor(opts: SkinnedBodyOpts = {}) {
    super({ key: opts.key });
    this.opts = opts;
  }

  override buildBehaviors(ctx: BuildContext): Behavior[] {
    const opts = this.opts;
    const skin = opts.skinColor ?? Palette.color(ctx, 'skin', 'brick');
    const tag = opts.tag ?? 'skinned_body';
    const explicitCast = opts.castShadow;
    const explicitReceive = opts.receiveShadow;

    return [{
      kind: 'skinned-body',
      config: { tag, skin, params: { ...opts } },
      onBuild(buildCtx) {
        const rig = buildCtx.refs.get('rig') as ResolvedRig | undefined;
        if (!rig) {
          throw new Error('[SkinnedBody] requires a Rig.* behavior earlier in the entity tree.');
        }
        if (!rig.skeleton) {
          throw new Error('[SkinnedBody] rig.skeleton is undefined — should be auto-created.');
        }

        rig.root.updateMatrixWorld(true);
        const { geometry } = generateSkinnedHumanoidGeometry(rig, opts);

        const material = makeMaterial('phong', {
          color: skin,
          shininess: 8,
          specular: 0x0a0a0a,
          flatShading: false,
        });

        const skinnedMesh = new THREE.SkinnedMesh(geometry, material);
        skinnedMesh.name = tag;
        skinnedMesh.bind(rig.skeleton, new THREE.Matrix4());

        const shadowsCfg = buildCtx.refs.get('__shadowsConfig') as
          | { cast?: boolean; receive?: boolean }
          | undefined;
        skinnedMesh.castShadow = explicitCast ?? shadowsCfg?.cast ?? false;
        skinnedMesh.receiveShadow = explicitReceive ?? shadowsCfg?.receive ?? false;

        if (tag) buildCtx.refs.set(tag, skinnedMesh);

        return { object: skinnedMesh };
      },
    }];
  }
}
