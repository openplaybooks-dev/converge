// KayKit Adventurer — Rogue (CC0). Default Idle.

import { GltfModel, widgetToAssetModule } from '@lego';

export default widgetToAssetModule(
  'rogue',
  {
    kind: 'character',
    archetype: 'biped',
    name: 'Rogue',
    description: 'KayKit Adventurer Rogue (CC0).',
  },
  new GltfModel({ asset: '/assets/characters/rogue.glb', animation: 'Idle' }),
);
