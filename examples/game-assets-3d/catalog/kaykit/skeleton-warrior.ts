// KayKit Skeleton — Warrior (CC0). Default Idle.

import { GltfModel, widgetToAssetModule } from '@lego';

export default widgetToAssetModule(
  'skeleton-warrior',
  {
    kind: 'character',
    archetype: 'biped',
    name: 'Skeleton Warrior',
    description: 'KayKit Skeleton Warrior — sword and shield (CC0).',
  },
  new GltfModel({ asset: '/assets/characters/skeleton_warrior.glb', animation: 'Idle' }),
);
