// KayKit Adventurer — Barbarian (CC0). Default Idle.

import { GltfModel, widgetToAssetModule } from '@lego';

export default widgetToAssetModule(
  'barbarian',
  {
    kind: 'character',
    archetype: 'biped',
    name: 'Barbarian',
    description: 'KayKit Adventurer Barbarian (CC0).',
  },
  new GltfModel({ asset: '/assets/characters/barbarian.glb', animation: 'Idle' }),
);
