// KayKit Knight playing Walking_A.

import { widgetToAssetModule } from '@lego';
import { HeroRealistic } from './hero-realistic.js';

export default widgetToAssetModule(
  'hero-realistic-walk',
  {
    kind: 'character',
    archetype: 'biped',
    name: 'Hero (Realistic, Walk)',
    description: 'KayKit Knight playing the Walking_A animation.',
  },
  new HeroRealistic({ animation: 'Walking_A' }),
);
