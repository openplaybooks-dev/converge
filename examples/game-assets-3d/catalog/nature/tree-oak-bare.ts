// Bare Oak — winter oak, branches but no leaves.

import { BuildContext, widgetToAssetModule } from '@lego';
import type { FoliageBuilder } from '@lego';
import { Oak } from './tree-oak.js';

export class BareOak extends Oak {
  protected override foliage(_ctx: BuildContext): FoliageBuilder | null {
    return null;
  }
}

export default widgetToAssetModule(
  'tree-oak-bare',
  {
    kind: 'environment',
    archetype: 'tree',
    name: 'Bare Oak',
    description: 'Leafless oak — flared trunk + visible 3-way branching silhouette.',
  },
  new BareOak(),
);
