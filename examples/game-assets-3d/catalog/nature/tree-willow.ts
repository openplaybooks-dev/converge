// Willow — flared trunk + small branches + clustered top + drooping fronds.

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  Palette, Seed,
  Trunk, Branch, FoliageCluster, WeepingFronds, RootFlare,
  type FoliageBuilder,
  widgetToAssetModule,
} from '@lego';
import type { ColorInput } from '@lego';

const TRUNK_H = 5;

export class Willow extends StatelessWidget3D {
  readonly trunkH: number;
  readonly seed: number;
  constructor(opts: { trunkH?: number; seed?: number; key?: string } = {}) {
    super({ key: opts.key });
    this.trunkH = opts.trunkH ?? TRUNK_H;
    this.seed = opts.seed ?? 79;
  }

  protected barkColor(ctx: BuildContext): ColorInput {
    return Palette.color(ctx, 'bark', 'willowBark');
  }
  protected leafColor(ctx: BuildContext): ColorInput {
    return Palette.color(ctx, 'leaves', 'willowGreen');
  }
  /** Set to false in BareWillow. */
  protected hasFoliage(): boolean { return true; }

  override build(ctx: BuildContext): Widget3D {
    const seed = Seed.value(ctx, this.seed);
    const bark = this.barkColor(ctx);
    const leaf = this.leafColor(ctx);

    const foliageBuilder: FoliageBuilder = ({ at, seed: tipSeed }) =>
      new FoliageCluster({
        count: 3,
        extent: [1.0, 0.6, 1.0],
        radius: 0.9,
        color: leaf,
        deformAmount: 0.35,
        hslJitter: { h: 0.02, s: 0.07, l: 0.05 },
        seed: tipSeed,
        at,
      });

    const children: Widget3D[] = [
      new Trunk({
        height: this.trunkH, radiusTop: 0.7, radiusBottom: 1.1,
        taper: 'flared', barkColor: bark,
        deformAmount: 0.15, noiseScale: 5,
        seed, tag: 'trunk',
      }),
      new Branch({
        length: this.trunkH * 0.5,
        radius: 0.5,
        depth: 2,
        splits: 2,
        splitAngle: 0.85,
        lengthFalloff: 0.6,
        radiusFalloff: 0.7,
        barkColor: bark,
        deformAmount: 0.10,
        seed: seed + 100,
        foliage: this.hasFoliage() ? foliageBuilder : undefined,
        at: [0, this.trunkH * 0.95, 0],
        tag: 'branches',
      }),
    ];
    if (this.hasFoliage()) {
      children.push(new WeepingFronds({
        count: 14, length: 3.0, spread: 1.8,
        color: leaf,
        seed: seed + 200,
        at: [0, this.trunkH * 1.1, 0],
      }));
    }
    children.push(new RootFlare({ count: 5, length: 1.4, thickness: 0.5, color: bark, seed: seed + 7 }));

    return new Stack3D({ name: 'willow', children });
  }
}

export default widgetToAssetModule(
  'tree-willow',
  { kind: 'environment', archetype: 'tree', name: 'Willow Tree',
    description: 'Squat flared trunk with 2-deep branching, clustered foliage, and 14 drooping fronds.' },
  new Willow(),
);
