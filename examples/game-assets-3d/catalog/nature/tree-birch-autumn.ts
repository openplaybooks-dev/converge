// Autumn Birch — golden foliage clusters with extra hue jitter for variety.

import { BuildContext, Palette, widgetToAssetModule } from '@lego';
import type { FoliageBuilder } from '@lego';
import { FoliageCluster } from '@lego';
import { Birch } from './tree-birch.js';

export class AutumnBirch extends Birch {
  protected override foliage(ctx: BuildContext): FoliageBuilder | null {
    const leaves = Palette.color(ctx, 'leaves', 'leafGold');
    return ({ at, seed: tipSeed }) =>
      new FoliageCluster({
        count: 4,
        extent: [1.4, 0.9, 1.4],
        radius: 0.9,
        color: leaves,
        deformAmount: 0.32,
        hslJitter: { h: 0.04, s: 0.10, l: 0.06 },
        seed: tipSeed,
        at,
        tag: 'foliage_autumn',
      });
  }
}

export default widgetToAssetModule(
  'tree-birch-autumn',
  {
    kind: 'environment',
    archetype: 'tree',
    name: 'Autumn Birch',
    description: 'Birch with golden foliage clusters and orange hue-jitter — late autumn.',
  },
  new AutumnBirch(),
);
