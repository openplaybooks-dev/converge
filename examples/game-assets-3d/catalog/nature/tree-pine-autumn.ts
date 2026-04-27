// Autumn Pine — pines don't really turn, but in our seasonal demo we tint
// them rust-tipped to match a warm forest palette.

import {
  BuildContext, Widget3D, Palette,
  PineCanopy,
  widgetToAssetModule,
} from '@lego';
import { Pine } from './tree-pine.js';

export class AutumnPine extends Pine {
  protected override foliage(ctx: BuildContext, seed: number): Widget3D | null {
    const leaves = Palette.color(ctx, 'leaves', 'leafRust');
    return new PineCanopy({
      layers: 4,
      baseRadius: 4,
      height: this.trunkH * 0.9,
      baseY: this.trunkH * 0.5,
      color: leaves,
      seed,
      tag: 'foliage_autumn',
    });
  }
}

export default widgetToAssetModule(
  'tree-pine-autumn',
  {
    kind: 'environment',
    archetype: 'tree',
    name: 'Autumn Pine',
    description: 'Pine with rust-tipped needles — autumn variant.',
  },
  new AutumnPine(),
);
