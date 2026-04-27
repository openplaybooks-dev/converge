// Child — short, thin Hero variant.

import { widgetToAssetModule, BuildContext, Widget3D, Hat } from '@lego';
import { Hero, type HeroOpts } from './hero.js';

export class Child extends Hero {
  constructor(opts: HeroOpts = {}) {
    super({
      height: opts.height ?? 0.65,
      build: opts.build ?? 'thin',
      weaponR: null, weaponL: null,
      ...opts,
    });
  }

  protected override defaultHat(_ctx: BuildContext): Widget3D | null {
    return new Hat({ style: 'cap', color: 'fireRed' });
  }
}

export default widgetToAssetModule(
  'hero-child',
  {
    kind: 'character',
    archetype: 'biped',
    name: 'Child',
    description: 'Small thin humanoid (height 0.65) with a red cap.',
  },
  new Child(),
);
