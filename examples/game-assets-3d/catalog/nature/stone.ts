// Stone cluster — widget API.

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  MeshIcosa,
  Palette, Seed,
  widgetToAssetModule,
} from '@lego';

const MAIN_SIZE = 1.6;
const SIDE_POSITIONS: Array<[number, number]> = [
  [-2.0, 0.5],
  [1.6, -1.2],
  [0.4, 2.1],
];
const SIDE_SIZES = [0.45, 0.35, 0.25];

export class Stone extends StatelessWidget3D {
  readonly seed: number;
  constructor(opts: { seed?: number; key?: string } = {}) {
    super({ key: opts.key });
    this.seed = opts.seed ?? 31;
  }

  override build(ctx: BuildContext): Widget3D {
    const seed = Seed.value(ctx, this.seed);
    const color = Palette.color(ctx, 'rock', 'rockGrey');

    return new Stack3D({
      name: 'stone',
      children: [
        new MeshIcosa({
          r: MAIN_SIZE, d: 0,
          deformBox: { amount: 0.6, seed },
          deformFlat: true,
          at: [0, MAIN_SIZE * 0.6, 0],
          rot: [0, 0.7, 0],
          material: { name: 'ground', opts: { color } },
          tag: 'main',
        }),
        new Stack3D({
          name: 'sides',
          children: SIDE_POSITIONS.map(([x, z], i) =>
            new MeshIcosa({
              r: SIDE_SIZES[i], d: 0,
              deformBox: { amount: 0.15, seed: seed + 10 + i },
              deformFlat: true,
              at: [x, SIDE_SIZES[i] * 0.6, z],
              rot: [0, i * 1.3, 0],
              material: { name: 'ground', opts: { color } },
              tag: `side_${i}`,
              key: `side_${i}`,
            })
          ),
        }),
      ],
    });
  }
}

export default widgetToAssetModule(
  'stone',
  {
    kind: 'environment',
    archetype: 'rock',
    name: 'Stone Cluster',
    description: 'One main deformed icosahedron boulder with three smaller scatter stones.',
  },
  new Stone(),
);
