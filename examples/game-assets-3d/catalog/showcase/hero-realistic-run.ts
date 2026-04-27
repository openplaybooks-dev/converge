// KayKit Knight playing Running_A.

import { widgetToAssetModule } from '@lego';
import { HeroRealistic } from './hero-realistic.js';

export default widgetToAssetModule(
  'hero-realistic-run',
  {
    kind: 'character',
    archetype: 'biped',
    name: 'Hero (Realistic, Run)',
    description: 'KayKit Knight playing the Running_A animation.',
  },
  new HeroRealistic({ animation: 'Running_A' }),
);
