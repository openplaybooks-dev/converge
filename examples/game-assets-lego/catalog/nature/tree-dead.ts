// Dead tree — gnarled deep-branching skeletal silhouette, no foliage.

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  Palette, Seed,
  Trunk, Branch,
  widgetToAssetModule,
} from '@lego';

export class Dead extends StatelessWidget3D {
  readonly trunkH: number;
  readonly seed: number;
  constructor(opts: { trunkH?: number; seed?: number; key?: string } = {}) {
    super({ key: opts.key });
    this.trunkH = opts.trunkH ?? 6.5;
    this.seed = opts.seed ?? 211;
  }

  override build(ctx: BuildContext): Widget3D {
    const seed = Seed.value(ctx, this.seed);
    const bark = Palette.color(ctx, 'bark', 'deadBark');

    return new Stack3D({
      name: 'dead',
      children: [
        new Trunk({
          height: this.trunkH, radiusTop: 0.25, radiusBottom: 0.9,
          taper: 'columnar', barkColor: bark,
          deformAmount: 0.22, noiseScale: 4,
          seed, tag: 'trunk',
        }),
        new Branch({
          length: this.trunkH * 0.4,
          radius: 0.3,
          depth: 3,
          splits: 2,
          splitAngle: 0.8,        // wider spread = more skeletal
          lengthFalloff: 0.6,
          radiusFalloff: 0.6,
          barkColor: bark,
          deformAmount: 0.15,
          seed: seed + 100,
          // No foliage builder — terminal tips are bare.
          at: [0, this.trunkH * 0.85, 0],
          tag: 'branches',
        }),
      ],
    });
  }
}

/** Alias — Dead is intrinsically bare. */
export const BareDead = Dead;

export default widgetToAssetModule(
  'tree-dead',
  { kind: 'environment', archetype: 'tree', name: 'Dead Tree',
    description: 'Skeletal weathered tree: deep recursive branching, grey-brown bark, no foliage.' },
  new Dead(),
);
