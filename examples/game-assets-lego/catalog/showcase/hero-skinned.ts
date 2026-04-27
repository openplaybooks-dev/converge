// Hero (skinned) — same as Hero but with bodyMode='skinned'. Showcases the
// continuous SkinnedMesh body that deforms smoothly across joints.

import { widgetToAssetModule } from '@lego';
import { Hero } from './hero.js';

export class HeroSkinned extends Hero {
  constructor(opts: ConstructorParameters<typeof Hero>[0] = {}) {
    super({ bodyMode: 'skinned', ...opts });
  }
}

export default widgetToAssetModule(
  'hero-skinned',
  {
    kind: 'character',
    archetype: 'biped',
    name: 'Hero (Skinned)',
    description: 'Continuous SkinnedMesh humanoid bound to the detailed rig — smooth bending at joints.',
  },
  new HeroSkinned(),
);
