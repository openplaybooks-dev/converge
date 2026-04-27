// KayKit Skeleton — Minion (CC0). Small zombie-style enemy. Default Idle.

import { GltfModel, widgetToAssetModule } from '@lego';

export default widgetToAssetModule(
  'skeleton-minion',
  {
    kind: 'character',
    archetype: 'biped',
    name: 'Skeleton Minion',
    description: 'KayKit Skeleton Minion — small enemy (CC0).',
  },
  new GltfModel({ asset: '/assets/characters/skeleton_minion.glb', animation: 'Idle' }),
);
