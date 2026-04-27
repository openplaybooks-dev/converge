// Mage — robe + wizard hat + wooden staff.

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  MeshCyl, MeshSphere,
  Hat, Shirt,
  widgetToAssetModule,
} from '@lego';
import { Hero, type HeroOpts } from './hero.js';

class Staff extends StatelessWidget3D {
  override build(_ctx: BuildContext): Widget3D {
    return new Stack3D({
      name: 'staff',
      children: [
        new MeshCyl({
          rt: 0.018, rb: 0.022, h: 1.2, rs: 8,
          at: [0, 0.4, 0],
          material: { name: 'bark', opts: { color: 'pineWood', noiseScale: 5 } },
          attach: 'weapon_mount_R', tag: 'staff_pole',
        }),
        new MeshSphere({
          r: 0.06, ws: 8, hs: 6,
          at: [0, 1.0, 0],
          material: { name: 'phong', opts: { color: 'fireOrange', shininess: 80, emissive: 'fireOrange', emissiveIntensity: 0.4 } },
          attach: 'weapon_mount_R', tag: 'staff_orb',
        }),
      ],
    });
  }
}

export class Mage extends Hero {
  constructor(opts: HeroOpts = {}) {
    super({
      weaponR: opts.weaponR ?? new Staff(),
      weaponL: opts.weaponL ?? null,
      pants: opts.pants ?? null,         // robe covers legs
      shoes: opts.shoes ?? null,
      ...opts,
    });
  }

  protected override defaultHat(_ctx: BuildContext): Widget3D | null {
    return new Hat({ style: 'wizard', color: 0x3a3070, bandColor: 'fireDarkYellow' });
  }
  protected override defaultShirt(_ctx: BuildContext): Widget3D | null {
    return new Shirt({ style: 'robe', sleeveLength: 'long', color: 0x3a3070, cuffColor: 'fireDarkYellow' });
  }
}

export default widgetToAssetModule(
  'hero-mage',
  {
    kind: 'character',
    archetype: 'biped',
    name: 'Mage',
    description: 'Hooded figure in a wizard hat and long robe with a glowing staff.',
  },
  new Mage(),
);
