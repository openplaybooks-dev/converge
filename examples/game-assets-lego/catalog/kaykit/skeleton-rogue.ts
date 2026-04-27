// KayKit Skeleton — Rogue (CC0). Default Idle.

import { GltfModel, widgetToAssetModule } from '@lego';

export default widgetToAssetModule(
  'skeleton-rogue',
  {
    kind: 'character',
    archetype: 'biped',
    name: 'Skeleton Rogue',
    description: 'KayKit Skeleton Rogue — daggers (CC0).',
  },
  new GltfModel({ asset: '/assets/characters/skeleton_rogue.glb', animation: 'Idle' }),
);
