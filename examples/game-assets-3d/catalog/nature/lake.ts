// Lake — widget API. Animated water surface via WaveSurface vertex displacement.

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  MeshPlane, MeshIcosa,
  WaveSurface,
  Palette, Seed,
  widgetToAssetModule,
} from '@lego';

const RADIUS = 6;
const RIM_COUNT = 8;

let LAKE_INSTANCE_ID = 0;

export class Lake extends StatelessWidget3D {
  readonly seed: number;
  private readonly instanceId: number;
  constructor(opts: { seed?: number; key?: string } = {}) {
    super({ key: opts.key });
    this.seed = opts.seed ?? 71;
    this.instanceId = LAKE_INSTANCE_ID++;
  }

  override build(ctx: BuildContext): Widget3D {
    const seed = Seed.value(ctx, this.seed);
    const water = Palette.color(ctx, 'water', 'water');
    const rock = Palette.color(ctx, 'rock', 'rockGrey');
    const surfaceTag = `lake_surface_${this.instanceId}`;

    return new Stack3D({
      name: 'lake',
      children: [
        // Segmented horizontal plane for the water (vertex-displaceable).
        new MeshPlane({
          w: RADIUS * 2, h: RADIUS * 2, ws: 30, hs: 30,
          at: [0, 0.05, 0],
          rot: [-Math.PI / 2, 0, 0],
          material: { name: 'water', opts: { color: water } },
          tag: surfaceTag,
        }),
        new WaveSurface({ target: surfaceTag, cycle: 4, height: 0.4, speed: 1 }),
        new Stack3D({
          name: 'rim',
          children: Array.from({ length: RIM_COUNT }, (_, i) => {
            const angle = (i / RIM_COUNT) * Math.PI * 2;
            const r = RADIUS + 0.4;
            return new MeshIcosa({
              r: 0.5, d: 0,
              deformBox: { amount: 0.15, seed: seed + i },
              deformFlat: true,
              at: [Math.cos(angle) * r, 0.18, Math.sin(angle) * r],
              rot: [0, i * 0.8, 0],
              material: { name: 'ground', opts: { color: rock } },
              tag: `rim_${i}`,
              key: `rim_${i}`,
            });
          }),
        }),
      ],
    });
  }
}

export default widgetToAssetModule(
  'lake',
  {
    kind: 'environment',
    archetype: 'water',
    name: 'Lake',
    description: 'Animated water disc with vertex-wave displacement, ringed by a low stone shoreline.',
  },
  new Lake(),
);
