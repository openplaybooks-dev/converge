import { widgetToAssetModule } from '@lego';
import { Sapling } from './tree-sapling.js';

export class BareSapling extends Sapling {
  protected override hasFoliage(): boolean { return false; }
}

export default widgetToAssetModule(
  'tree-sapling-bare',
  { kind: 'environment', archetype: 'tree', name: 'Bare Sapling',
    description: 'Leafless sapling.' },
  new BareSapling(),
);
