import { widgetToAssetModule } from '@lego';
import { Bush } from './tree-bush.js';

export class BareBush extends Bush {
  protected override hasFoliage(): boolean { return false; }
}

export default widgetToAssetModule(
  'tree-bush-bare',
  { kind: 'environment', archetype: 'plant', name: 'Bare Bush',
    description: 'Leafless bush stub.' },
  new BareBush(),
);
