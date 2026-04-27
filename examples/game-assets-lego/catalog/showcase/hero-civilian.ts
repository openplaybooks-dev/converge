// Civilian — base Hero defaults explicitly with no weapons. Mostly catalog
// visibility for the variant pattern.

import { widgetToAssetModule } from '@lego';
import { Hero, type HeroOpts } from './hero.js';

export class Civilian extends Hero {
  constructor(opts: HeroOpts = {}) {
    super({ weaponR: null, weaponL: null, ...opts });
  }
}

export default widgetToAssetModule(
  'hero-civilian',
  {
    kind: 'character',
    archetype: 'biped',
    name: 'Civilian',
    description: 'Average-build humanoid in casual long-sleeve shirt and pants. No weapons.',
  },
  new Civilian(),
);
