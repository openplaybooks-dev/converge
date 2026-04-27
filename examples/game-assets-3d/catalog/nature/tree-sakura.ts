// Sakura (cherry blossom) — slim trunk + 2-deep branches + pink foliage clusters
// + scattered fallen petals.

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  Palette, Seed,
  Trunk, Branch, FoliageCluster, FallenDebris, RootFlare,
  type FoliageBuilder,
  widgetToAssetModule,
} from '@lego';
import type { ColorInput } from '@lego';

const TRUNK_H = 5.5;

export class Sakura extends StatelessWidget3D {
  readonly trunkH: number;
  readonly seed: number;
  constructor(opts: { trunkH?: number; seed?: number; key?: string } = {}) {
    super({ key: opts.key });
    this.trunkH = opts.trunkH ?? TRUNK_H;
    this.seed = opts.seed ?? 113;
  }

  protected barkColor(ctx: BuildContext): ColorInput {
    return Palette.color(ctx, 'bark', 'sakuraBark');
  }
  protected blossomColor(ctx: BuildContext): ColorInput {
    return Palette.color(ctx, 'leaves', 'sakuraPink');
  }
  protected hasFoliage(): boolean { return true; }
  protected hasPetals(): boolean { return true; }

  override build(ctx: BuildContext): Widget3D {
    const seed = Seed.value(ctx, this.seed);
    const bark = this.barkColor(ctx);
    const blossom = this.blossomColor(ctx);

    const foliageBuilder: FoliageBuilder = ({ at, seed: tipSeed }) =>
      new FoliageCluster({
        count: 3,
        extent: [1.2, 0.7, 1.2],
        radius: 1.0,
        color: blossom,
        deformAmount: 0.4,
        hslJitter: { h: 0.04, s: 0.12, l: 0.08 },
        seed: tipSeed,
        at,
      });

    const children: Widget3D[] = [
      new Trunk({
        height: this.trunkH, radiusTop: 0.45, radiusBottom: 0.7,
        taper: 'linear', barkColor: bark,
        deformAmount: 0.10, noiseScale: 6,
        seed, tag: 'trunk',
      }),
      new Branch({
        length: this.trunkH * 0.55,
        radius: 0.4,
        depth: 2,
        splits: 2,
        splitAngle: 0.7,
        lengthFalloff: 0.6,
        radiusFalloff: 0.7,
        barkColor: bark,
        deformAmount: 0.08,
        seed: seed + 100,
        foliage: this.hasFoliage() ? foliageBuilder : undefined,
        at: [0, this.trunkH * 0.95, 0],
        tag: 'branches',
      }),
    ];
    if (this.hasPetals()) {
      children.push(new FallenDebris({
        count: 5, radius: 2.5, itemRadius: 0.18,
        color: blossom,
        seed: seed + 3000,
      }));
    }
    children.push(new RootFlare({ count: 4, length: 0.8, thickness: 0.3, color: bark, seed: seed + 7 }));

    return new Stack3D({ name: 'sakura', children });
  }
}

export default widgetToAssetModule(
  'tree-sakura',
  { kind: 'environment', archetype: 'tree', name: 'Sakura',
    description: 'Cherry blossom: slim trunk, branching with pink-blossom clusters, scattered petals at the base.' },
  new Sakura(),
);
