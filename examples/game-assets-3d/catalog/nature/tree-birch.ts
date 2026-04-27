// Birch tree — tall slender white-bark with paired branches and small foliage clusters.

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  Palette, Seed,
  Trunk, Branch, FoliageCluster, RootFlare,
  type FoliageBuilder,
  widgetToAssetModule,
} from '@lego';
import type { ColorInput } from '@lego';

const TRUNK_H = 8.0;
const TRUNK_RB = 0.45;
const TRUNK_RT = 0.30;

export class Birch extends StatelessWidget3D {
  readonly trunkH: number;
  readonly seed: number;

  constructor(opts: { trunkH?: number; seed?: number; key?: string } = {}) {
    super({ key: opts.key });
    this.trunkH = opts.trunkH ?? TRUNK_H;
    this.seed = opts.seed ?? 41;
  }

  /** Variant override: returns a foliage builder, or null for bare. */
  protected foliage(ctx: BuildContext): FoliageBuilder | null {
    const leaves = Palette.color(ctx, 'leaves', 'green');
    return ({ at, seed: tipSeed }) =>
      new FoliageCluster({
        count: 4,
        extent: [1.4, 0.9, 1.4],
        radius: 0.9,
        color: leaves,
        deformAmount: 0.32,
        hslJitter: { h: 0.02, s: 0.08, l: 0.06 },
        seed: tipSeed,
        at,
        tag: 'foliage',
      });
  }

  protected barkColor(ctx: BuildContext): ColorInput {
    return Palette.color(ctx, 'bark', 'birchBark');
  }

  override build(ctx: BuildContext): Widget3D {
    const seed = Seed.value(ctx, this.seed);
    const bark = this.barkColor(ctx);
    const foliage = this.foliage(ctx);

    return new Stack3D({
      name: 'birch',
      children: [
        new Trunk({
          height: this.trunkH,
          radiusTop: TRUNK_RT,
          radiusBottom: TRUNK_RB,
          barkColor: bark,
          deformAmount: 0.04,           // birch is smooth
          yBand: [0, 0.55],             // keep upper trunk clean
          noiseScale: 12,
          seed,
          tag: 'trunk',
        }),
        new Branch({
          length: this.trunkH * 0.45,
          radius: TRUNK_RT * 0.85,
          depth: 2,
          splits: 2,
          splitAngle: 0.65,
          lengthFalloff: 0.62,
          radiusFalloff: 0.7,
          barkColor: bark,
          deformAmount: 0.05,
          seed: seed + 100,
          foliage: foliage ?? undefined,
          at: [0, this.trunkH * 0.65, 0],
          tag: 'branches',
        }),
        new RootFlare({
          count: 4,
          length: 0.8,
          thickness: 0.25,
          color: bark,
          seed: seed + 7,
        }),
      ],
    });
  }
}

export default widgetToAssetModule(
  'tree-birch',
  {
    kind: 'environment',
    archetype: 'tree',
    name: 'Birch Tree',
    description: 'Tall slender white-bark birch with paired branches and small green foliage clusters.',
  },
  new Birch(),
);
