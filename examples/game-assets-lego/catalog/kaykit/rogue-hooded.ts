// KayKit Adventurer — Hooded Rogue (CC0). Default Idle.

import { GltfModel, widgetToAssetModule } from '@lego';

export default widgetToAssetModule(
  'rogue-hooded',
  {
    kind: 'character',
    archetype: 'biped',
    name: 'Rogue (Hooded)',
    description: 'KayKit Adventurer Rogue with hood (CC0).',
  },
  new GltfModel({ asset: '/assets/characters/rogue_hooded.glb', animation: 'Idle' }),
);
