// KayKit Adventurer — Knight (CC0). Default Idle.

import { GltfModel, widgetToAssetModule } from '@lego';

export default widgetToAssetModule(
  'knight',
  {
    kind: 'character',
    archetype: 'biped',
    name: 'Knight',
    description: 'KayKit Adventurer Knight (CC0). 76 baked animations.',
  },
  new GltfModel({ asset: '/assets/characters/knight.glb', animation: 'Idle' }),
);
