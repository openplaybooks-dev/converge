import { widgetToAssetModule } from '@lego';
import { Sakura } from './tree-sakura.js';

export class BareSakura extends Sakura {
  protected override hasFoliage(): boolean { return false; }
  protected override hasPetals(): boolean { return false; }
}

export default widgetToAssetModule(
  'tree-sakura-bare',
  { kind: 'environment', archetype: 'tree', name: 'Bare Sakura',
    description: 'Bare cherry tree — branches, no blossoms.' },
  new BareSakura(),
);
