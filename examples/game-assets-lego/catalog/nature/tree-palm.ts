// Palm tree — slender curved trunk + 7 fronds radiating from the top.

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  Palette, Seed,
  Trunk, PalmFronds, RootFlare,
  widgetToAssetModule,
} from '@lego';
import type { ColorInput } from '@lego';

const TRUNK_H = 7;

export class Palm extends StatelessWidget3D {
  readonly trunkH: number;
  readonly seed: number;
  constructor(opts: { trunkH?: number; seed?: number; key?: string } = {}) {
    super({ key: opts.key });
    this.trunkH = opts.trunkH ?? TRUNK_H;
    this.seed = opts.seed ?? 137;
  }

  protected barkColor(ctx: BuildContext): ColorInput {
    return Palette.color(ctx, 'bark', 'palmBark');
  }
  protected frondColor(ctx: BuildContext): ColorInput {
    return Palette.color(ctx, 'leaves', 'green');
  }
  protected hasFronds(): boolean { return true; }

  override build(ctx: BuildContext): Widget3D {
    const seed = Seed.value(ctx, this.seed);
    const bark = this.barkColor(ctx);
    const frondColor = this.frondColor(ctx);

    const children: Widget3D[] = [
      new Trunk({
        height: this.trunkH, radiusTop: 0.45, radiusBottom: 0.55,
        taper: 'linear', barkColor: bark,
        deformAmount: 0.18, noiseScale: 4,
        seed, tag: 'trunk',
      }),
    ];
    if (this.hasFronds()) {
      children.push(new PalmFronds({
        count: 7, length: 4.5, droop: 0.35,
        color: frondColor,
        seed: seed + 100,
        at: [0, this.trunkH, 0],
      }));
    }
    children.push(new RootFlare({ count: 4, length: 0.7, thickness: 0.25, color: bark, seed: seed + 7 }));
    return new Stack3D({ name: 'palm', children });
  }
}

export default widgetToAssetModule(
  'tree-palm',
  { kind: 'environment', archetype: 'tree', name: 'Palm Tree',
    description: 'Slender sandy-bark palm with 7 cone fronds radiating from the crown.' },
  new Palm(),
);
