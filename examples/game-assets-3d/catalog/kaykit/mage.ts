// KayKit Adventurer — Mage (CC0). Default Idle.

import { GltfModel, widgetToAssetModule } from '@lego';

export default widgetToAssetModule(
  'mage',
  {
    kind: 'character',
    archetype: 'biped',
    name: 'Mage',
    description: 'KayKit Adventurer Mage (CC0).',
  },
  new GltfModel({ asset: '/assets/characters/mage.glb', animation: 'Idle' }),
);
