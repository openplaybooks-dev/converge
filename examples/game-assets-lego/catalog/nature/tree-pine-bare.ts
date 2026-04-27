// Bare Pine — winter conifer, all branches still as the trunk + roots, no needles.

import { BuildContext, Widget3D, widgetToAssetModule } from '@lego';
import { Pine } from './tree-pine.js';

export class BarePine extends Pine {
  protected override foliage(_ctx: BuildContext, _seed: number): Widget3D | null {
    return null;
  }
}

export default widgetToAssetModule(
  'tree-pine-bare',
  {
    kind: 'environment',
    archetype: 'tree',
    name: 'Bare Pine',
    description: 'Pine trunk with no needles — winter or dead.',
  },
  new BarePine(),
);
