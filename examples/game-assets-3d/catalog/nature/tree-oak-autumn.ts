// Autumn Oak — rust-tinted foliage with stronger hue jitter.

import { BuildContext, Palette, widgetToAssetModule } from '@lego';
import type { FoliageBuilder } from '@lego';
import { FoliageCluster } from '@lego';
import { Oak } from './tree-oak.js';

export class AutumnOak extends Oak {
  protected override foliage(ctx: BuildContext): FoliageBuilder | null {
    const leaves = Palette.color(ctx, 'leaves', 'leafCrimson');
    return ({ at, seed: tipSeed }) =>
      new FoliageCluster({
        count: 3,
        extent: [1.4, 0.8, 1.4],
        radius: 1.4,
        color: leaves,
        deformAmount: 0.45,
        hslJitter: { h: 0.06, s: 0.12, l: 0.08 },
        seed: tipSeed,
        at,
        tag: 'foliage_autumn',
      });
  }
}

export default widgetToAssetModule(
  'tree-oak-autumn',
  {
    kind: 'environment',
    archetype: 'tree',
    name: 'Autumn Oak',
    description: 'Oak with crimson foliage — peak autumn.',
  },
  new AutumnOak(),
);
