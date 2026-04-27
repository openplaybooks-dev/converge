// Hero (simple) — the legacy 6-primitive Hero, preserved for users that want
// the minimal aesthetic (and the 18-bone humanoid rig). The new `Hero` builder
// in `tree-hero.ts` is the recommended path.

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  Skeleton, MeshCapsule, MeshBox, MeshCyl,
  Palette,
  Idle,
  widgetToAssetModule,
} from '@lego';

export class HeroSimple extends StatelessWidget3D {
  override build(ctx: BuildContext): Widget3D {
    const skin = Palette.color(ctx, 'skin', 'brick');
    const shirt = Palette.color(ctx, 'shirt', 'pineGreen');
    const pants = Palette.color(ctx, 'pants', 'rockGrey');

    return new Stack3D({
      name: 'hero-simple',
      children: [
        new Skeleton({ kind: 'humanoid' }),
        new MeshCapsule({
          r: 0.18, l: 0.40,
          material: { name: 'toon', opts: { color: shirt } },
          attach: 'chest', tag: 'torso',
        }),
        new MeshBox({
          w: 0.30, h: 0.30, d: 0.30,
          material: { name: 'toon', opts: { color: skin } },
          attach: 'head', tag: 'head',
        }),
        new MeshCyl({
          rt: 0.06, rb: 0.06, h: 0.32,
          material: { name: 'toon', opts: { color: shirt } },
          attach: 'arm_R',
        }),
        new MeshCyl({
          rt: 0.06, rb: 0.06, h: 0.32,
          material: { name: 'toon', opts: { color: shirt } },
          attach: 'arm_L',
        }),
        new MeshCyl({
          rt: 0.07, rb: 0.07, h: 0.40,
          material: { name: 'toon', opts: { color: pants } },
          attach: 'leg_R',
        }),
        new MeshCyl({
          rt: 0.07, rb: 0.07, h: 0.40,
          material: { name: 'toon', opts: { color: pants } },
          attach: 'leg_L',
        }),
        new Idle(),
      ],
    });
  }
}

export default widgetToAssetModule(
  'hero-simple',
  {
    kind: 'character',
    archetype: 'biped',
    name: 'Hero (Simple)',
    description: 'Legacy 6-primitive humanoid (18-bone rig). Use Hero for the detailed builder.',
  },
  new HeroSimple(),
);
