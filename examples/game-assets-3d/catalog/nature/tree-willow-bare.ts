import { widgetToAssetModule } from '@lego';
import { Willow } from './tree-willow.js';

export class BareWillow extends Willow {
  protected override hasFoliage(): boolean { return false; }
}

export default widgetToAssetModule(
  'tree-willow-bare',
  { kind: 'environment', archetype: 'tree', name: 'Bare Willow',
    description: 'Bare willow — flared trunk + skeletal branches, no leaves or fronds.' },
  new BareWillow(),
);
