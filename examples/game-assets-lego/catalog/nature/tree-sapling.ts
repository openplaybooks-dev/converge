// Sapling — tiny young tree, single split + 3 small leaves.

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  Palette, Seed,
  Trunk, Branch, FoliageCluster,
  type FoliageBuilder,
  widgetToAssetModule,
} from '@lego';
import type { ColorInput } from '@lego';

export class Sapling extends StatelessWidget3D {
  readonly seed: number;
  constructor(opts: { seed?: number; key?: string } = {}) {
    super({ key: opts.key });
    this.seed = opts.seed ?? 191;
  }

  protected leafColor(ctx: BuildContext): ColorInput {
    return Palette.color(ctx, 'leaves', 'green');
  }
  protected hasFoliage(): boolean { return true; }

  override build(ctx: BuildContext): Widget3D {
    const seed = Seed.value(ctx, this.seed);
    const bark = Palette.color(ctx, 'bark', 'pineWood');
    const leaf = this.leafColor(ctx);

    const foliage: FoliageBuilder = ({ at, seed: tipSeed }) =>
      new FoliageCluster({
        count: 2,
        extent: [0.4, 0.3, 0.4],
        radius: 0.35,
        color: leaf,
        deformAmount: 0.3,
        seed: tipSeed,
        at,
      });

    return new Stack3D({
      name: 'sapling',
      children: [
        new Trunk({
          height: 1.2, radiusTop: 0.10, radiusBottom: 0.15,
          taper: 'linear', barkColor: bark,
          deformAmount: 0.05, noiseScale: 6,
          seed, tag: 'trunk',
        }),
        new Branch({
          length: 0.6,
          radius: 0.10,
          depth: 1,
          splits: 2,
          splitAngle: 0.6,
          lengthFalloff: 0.6,
          radiusFalloff: 0.7,
          barkColor: bark,
          deformAmount: 0.05,
          seed: seed + 100,
          foliage: this.hasFoliage() ? foliage : undefined,
          at: [0, 1.2, 0],
          tag: 'branches',
        }),
      ],
    });
  }
}

export default widgetToAssetModule(
  'tree-sapling',
  { kind: 'environment', archetype: 'tree', name: 'Sapling',
    description: 'Young tree: single split + tiny leaf clusters.' },
  new Sapling(),
);
