// Oak tree — refactored onto the toolkit. Trunk + 2-deep branches + clustered
// foliage at every branch tip. Variants override foliage()/barkColor().

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  Palette, Seed,
  Trunk, Branch, FoliageCluster, RootFlare,
  type FoliageBuilder,
  TREE_LEAVES_COLORS,
  widgetToAssetModule,
} from '@lego';
import type { ColorInput } from '@lego';

const TRUNK_H = 6;
const TRUNK_RB = 1.3;
const TRUNK_RT = 0.55;

export class Oak extends StatelessWidget3D {
  readonly trunkH: number;
  readonly seed: number;

  constructor(opts: { trunkH?: number; seed?: number; key?: string } = {}) {
    super({ key: opts.key });
    this.trunkH = opts.trunkH ?? TRUNK_H;
    this.seed = opts.seed ?? 11;
  }

  protected barkColor(ctx: BuildContext): ColorInput {
    return Palette.color(ctx, 'bark', 'blobWood');
  }

  protected foliage(ctx: BuildContext): FoliageBuilder | null {
    const leaves = Palette.color(ctx, 'leaves', TREE_LEAVES_COLORS[0]);
    return ({ at, seed: tipSeed }) =>
      new FoliageCluster({
        count: 3,
        extent: [1.4, 0.8, 1.4],
        radius: 1.4,
        color: leaves,
        deformAmount: 0.45,
        hslJitter: { h: 0.03, s: 0.10, l: 0.07 },
        seed: tipSeed,
        at,
      });
  }

  override build(ctx: BuildContext): Widget3D {
    const seed = Seed.value(ctx, this.seed);
    const bark = this.barkColor(ctx);
    const foliage = this.foliage(ctx);

    return new Stack3D({
      name: 'oak',
      children: [
        new Trunk({
          height: this.trunkH,
          radiusTop: TRUNK_RT,
          radiusBottom: TRUNK_RB,
          taper: 'flared',
          barkColor: bark,
          deformAmount: 0.16,
          noiseScale: 5,
          seed,
          tag: 'trunk',
        }),
        new Branch({
          length: this.trunkH * 0.55,
          radius: TRUNK_RT * 0.95,
          depth: 2,
          splits: 2,
          splitAngle: 0.7,
          lengthFalloff: 0.6,
          radiusFalloff: 0.7,
          barkColor: bark,
          deformAmount: 0.10,
          seed: seed + 100,
          foliage: foliage ?? undefined,
          at: [0, this.trunkH * 0.85, 0],
          tag: 'branches',
        }),
        new RootFlare({
          count: 6,
          length: 1.4,
          thickness: 0.45,
          color: bark,
          seed: seed + 7,
        }),
      ],
    });
  }
}

export default widgetToAssetModule(
  'tree-oak',
  {
    kind: 'environment',
    archetype: 'tree',
    name: 'Oak Tree',
    description: 'Stocky deciduous oak: flared trunk with 3-way branching and clustered foliage at every tip.',
  },
  new Oak(),
);
