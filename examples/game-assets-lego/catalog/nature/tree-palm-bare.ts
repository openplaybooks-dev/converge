import { widgetToAssetModule } from '@lego';
import { Palm } from './tree-palm.js';

export class BarePalm extends Palm {
  protected override hasFronds(): boolean { return false; }
}

export default widgetToAssetModule(
  'tree-palm-bare',
  { kind: 'environment', archetype: 'tree', name: 'Bare Palm',
    description: 'Bare palm trunk — fronds stripped (storm or off-season).' },
  new BarePalm(),
);
