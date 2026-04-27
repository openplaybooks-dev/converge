// Pine tree — refactored onto the shared tree toolkit. Constructor signature
// unchanged; `protected foliage()` and `barkColor()` virtuals let variants
// (BarePine, AutumnPine) override only the pieces that change.

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  Palette, Seed,
  Trunk, PineCanopy, RootFlare,
  widgetToAssetModule,
} from '@lego';
import type { ColorInput } from '@lego';

const TRUNK_HEIGHT = 7;

export class Pine extends StatelessWidget3D {
  readonly trunkH: number;
  readonly trunkRTop: number;
  readonly trunkRBot: number;
  readonly seed: number;

  constructor(opts: { trunkH?: number; trunkRTop?: number; trunkRBot?: number; seed?: number; key?: string } = {}) {
    super({ key: opts.key });
    this.trunkH = opts.trunkH ?? TRUNK_HEIGHT;
    this.trunkRTop = opts.trunkRTop ?? 0.55;
    this.trunkRBot = opts.trunkRBot ?? 1.0;
    this.seed = opts.seed ?? 7;
  }

  /** Variant override point: trunk bark color. Reads Palette by default. */
  protected barkColor(ctx: BuildContext): ColorInput {
    return Palette.color(ctx, 'bark', 'pineWood');
  }

  /** Variant override point: returns a foliage widget, or null for bare. */
  protected foliage(ctx: BuildContext, seed: number): Widget3D | null {
    const leaves = Palette.color(ctx, 'leaves', 'pineGreen');
    return new PineCanopy({
      layers: 4,
      baseRadius: 4,
      height: this.trunkH * 0.9,
      baseY: this.trunkH * 0.5,
      color: leaves,
      seed,
      tag: 'foliage',
    });
  }

  override build(ctx: BuildContext): Widget3D {
    const seed = Seed.value(ctx, this.seed);
    const bark = this.barkColor(ctx);
    const ground = Palette.color(ctx, 'ground', 'grassGreen');
    const foliage = this.foliage(ctx, seed);

    const children: Widget3D[] = [
      new Trunk({
        height: this.trunkH,
        radiusTop: this.trunkRTop,
        radiusBottom: this.trunkRBot,
        barkColor: bark,
        deformAmount: 0.18,
        noiseScale: 6,
        seed,
        tag: 'trunk',
      }),
    ];
    if (foliage) children.push(foliage);
    children.push(
      new RootFlare({
        count: 5,
        length: 1.3,
        thickness: 0.4,
        color: ground,
        seed: seed + 7,
      }),
    );

    return new Stack3D({ name: 'pine', children });
  }
}

export default widgetToAssetModule(
  'tree-pine',
  {
    kind: 'environment',
    archetype: 'tree',
    name: 'Pine Tree',
    description: 'Stylized pine: tapered organic trunk with four stacked cone foliage layers + radial root flare.',
  },
  new Pine(),
);
