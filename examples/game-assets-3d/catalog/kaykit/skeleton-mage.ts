// KayKit Skeleton — Mage (CC0). Default Idle.

import { GltfModel, widgetToAssetModule } from '@lego';

export default widgetToAssetModule(
  'skeleton-mage',
  {
    kind: 'character',
    archetype: 'biped',
    name: 'Skeleton Mage',
    description: 'KayKit Skeleton Mage — staff caster (CC0).',
  },
  new GltfModel({ asset: '/assets/characters/skeleton_mage.glb', animation: 'Idle' }),
);
