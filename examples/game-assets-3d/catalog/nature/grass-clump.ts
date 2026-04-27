// Grass clump — widget API.

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  MeshBox,
  Palette, Seed,
  widgetToAssetModule,
} from '@lego';

const STEM_W = 0.18;
const STEM_H = 1.6;
const N_SIDE = 5;
const SIDE_RADIUS = 0.28;

export class GrassClump extends StatelessWidget3D {
  readonly seed: number;
  constructor(opts: { seed?: number; key?: string } = {}) {
    super({ key: opts.key });
    this.seed = opts.seed ?? 53;
  }

  override build(ctx: BuildContext): Widget3D {
    const seed = Seed.value(ctx, this.seed);
    const color = Palette.color(ctx, 'leaves', 'grassGreen');

    return new Stack3D({
      name: 'grass-clump',
      children: [
        new MeshBox({
          w: STEM_W, h: STEM_H, d: STEM_W,
          deformGrass: { amount: 0.5, seed },
          at: [0, STEM_H / 2, 0],
          rot: [0, 0.4, 0],
          material: { name: 'ground', opts: { color } },
          tag: 'mainStem',
        }),
        new Stack3D({
          name: 'sides',
          children: Array.from({ length: N_SIDE }, (_, i) => {
            const angle = (i / N_SIDE) * Math.PI * 2;
            const h = STEM_H * (0.7 + ((i * 0.13) % 0.2));
            return new MeshBox({
              w: STEM_W, h, d: STEM_W,
              deformGrass: { amount: 0.4, seed: seed + 8 + i },
              at: [Math.cos(angle) * SIDE_RADIUS, h / 2, Math.sin(angle) * SIDE_RADIUS],
              rot: [0, i * 1.1, 0],
              material: { name: 'ground', opts: { color } },
              tag: `side_${i}`,
              key: `side_${i}`,
            });
          }),
        }),
      ],
    });
  }
}

export default widgetToAssetModule(
  'grass-clump',
  {
    kind: 'environment',
    archetype: 'plant',
    name: 'Grass Clump',
    description: 'Bladed central stem ringed by five shorter side stems — tufted ground cover.',
  },
  new GrassClump(),
);
