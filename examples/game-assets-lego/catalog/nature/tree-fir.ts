// Fir tree — very tall conifer with 6 droopy layers, narrower than Pine.

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  Palette, Seed,
  Trunk, PineCanopy, RootFlare,
  widgetToAssetModule,
} from '@lego';
import type { ColorInput } from '@lego';

const TRUNK_H = 9;

export class Fir extends StatelessWidget3D {
  readonly trunkH: number;
  readonly seed: number;
  constructor(opts: { trunkH?: number; seed?: number; key?: string } = {}) {
    super({ key: opts.key });
    this.trunkH = opts.trunkH ?? TRUNK_H;
    this.seed = opts.seed ?? 53;
  }

  protected barkColor(ctx: BuildContext): ColorInput {
    return Palette.color(ctx, 'bark', 'pineWood');
  }
  protected foliage(ctx: BuildContext, seed: number): Widget3D | null {
    const leaves = Palette.color(ctx, 'leaves', 'pineGreen');
    return new PineCanopy({
      layers: 6,
      baseRadius: 3.2,
      height: this.trunkH * 0.85,
      baseY: this.trunkH * 0.4,
      // Tighter spacing than Pine — droopier silhouette.
      layerScales: [1.0, 0.85, 0.72, 0.6, 0.5, 0.4],
      color: leaves,
      seed,
      tag: 'foliage',
    });
  }

  override build(ctx: BuildContext): Widget3D {
    const seed = Seed.value(ctx, this.seed);
    const bark = this.barkColor(ctx);
    const foliage = this.foliage(ctx, seed);
    const children: Widget3D[] = [
      new Trunk({
        height: this.trunkH, radiusTop: 0.4, radiusBottom: 0.9,
        taper: 'columnar', barkColor: bark,
        deformAmount: 0.12, noiseScale: 7,
        seed, tag: 'trunk',
      }),
    ];
    if (foliage) children.push(foliage);
    children.push(new RootFlare({ count: 5, length: 1.0, thickness: 0.35, color: bark, seed: seed + 7 }));
    return new Stack3D({ name: 'fir', children });
  }
}

export default widgetToAssetModule(
  'tree-fir',
  { kind: 'environment', archetype: 'tree', name: 'Fir Tree',
    description: 'Tall narrow conifer with 6 stacked droopy layers — alpine forest fir.' },
  new Fir(),
);
