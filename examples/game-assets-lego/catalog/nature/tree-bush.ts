// Bush — tiny stub trunk + large foliage cluster.

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  Palette, Seed,
  Trunk, FoliageCluster,
  widgetToAssetModule,
} from '@lego';
import type { ColorInput } from '@lego';

export class Bush extends StatelessWidget3D {
  readonly seed: number;
  constructor(opts: { seed?: number; key?: string } = {}) {
    super({ key: opts.key });
    this.seed = opts.seed ?? 167;
  }

  protected leafColor(ctx: BuildContext): ColorInput {
    return Palette.color(ctx, 'leaves', 'green');
  }
  protected hasFoliage(): boolean { return true; }

  override build(ctx: BuildContext): Widget3D {
    const seed = Seed.value(ctx, this.seed);
    const leaf = this.leafColor(ctx);

    const children: Widget3D[] = [
      new Trunk({
        height: 0.4, radiusTop: 0.4, radiusBottom: 0.5,
        taper: 'flared', barkColor: 'pineWood',
        deformAmount: 0.10, noiseScale: 4,
        seed, tag: 'trunk',
      }),
    ];
    if (this.hasFoliage()) {
      children.push(new FoliageCluster({
        count: 8,
        extent: [1.6, 0.9, 1.6],
        radius: 1.0,
        color: leaf,
        deformAmount: 0.45,
        hslJitter: { h: 0.04, s: 0.10, l: 0.07 },
        seed: seed + 1000,
        at: [0, 0.8, 0],
      }));
    }
    return new Stack3D({ name: 'bush', children });
  }
}

export default widgetToAssetModule(
  'tree-bush',
  { kind: 'environment', archetype: 'plant', name: 'Bush',
    description: 'Squat bushy plant: short trunk stub topped with 8 leafy blobs.' },
  new Bush(),
);
