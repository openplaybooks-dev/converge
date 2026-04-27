// Bare Birch — same trunk + branches, no foliage. Branches visible through.

import { BuildContext, widgetToAssetModule } from '@lego';
import type { FoliageBuilder } from '@lego';
import { Birch } from './tree-birch.js';

export class BareBirch extends Birch {
  protected override foliage(_ctx: BuildContext): FoliageBuilder | null {
    return null;
  }
}

export default widgetToAssetModule(
  'tree-birch-bare',
  {
    kind: 'environment',
    archetype: 'tree',
    name: 'Bare Birch',
    description: 'Leafless winter birch — slender white trunk with exposed branching silhouette.',
  },
  new BareBirch(),
);
