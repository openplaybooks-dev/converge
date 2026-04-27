// Warrior — broad-build Hero with helmet, leather armor, sword, and shield.

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  MeshBox, MeshCyl,
  Hat, Pants, Shirt, Belt, Shoes,
  widgetToAssetModule,
} from '@lego';
import { Hero, type HeroOpts } from './hero.js';

/** Sword that attaches its meshes to weapon_mount_R automatically. */
class Sword extends StatelessWidget3D {
  override build(_ctx: BuildContext): Widget3D {
    return new Stack3D({
      name: 'sword',
      children: [
        // Blade.
        new MeshBox({
          w: 0.04, h: 0.7, d: 0.01,
          at: [0, 0.35, 0],
          material: { name: 'phong', opts: { color: 'lightMetal', shininess: 80 } },
          attach: 'weapon_mount_R', tag: 'sword_blade',
        }),
        // Cross-guard.
        new MeshBox({
          w: 0.16, h: 0.03, d: 0.04,
          at: [0, 0.04, 0],
          material: { name: 'phong', opts: { color: 'darkMetal' } },
          attach: 'weapon_mount_R', tag: 'sword_guard',
        }),
        // Grip.
        new MeshCyl({
          rt: 0.018, rb: 0.018, h: 0.10, rs: 8,
          at: [0, -0.05, 0],
          material: { name: 'phong', opts: { color: 'pineWood' } },
          attach: 'weapon_mount_R', tag: 'sword_grip',
        }),
      ],
    });
  }
}

class Shield extends StatelessWidget3D {
  override build(_ctx: BuildContext): Widget3D {
    return new MeshBox({
      w: 0.30, h: 0.45, d: 0.05,
      at: [0, 0, 0.05],
      material: { name: 'phong', opts: { color: 'fenceWood' } },
      attach: 'weapon_mount_L', tag: 'shield_face',
    });
  }
}

export interface WarriorOpts extends HeroOpts {
  hasShield?: boolean;
  hasSword?: boolean;
}

export class Warrior extends Hero {
  constructor(opts: WarriorOpts = {}) {
    super({
      build: opts.build ?? 'broad',
      weaponR: opts.weaponR ?? (opts.hasSword !== false ? new Sword() : null),
      weaponL: opts.weaponL ?? (opts.hasShield !== false ? new Shield() : null),
      ...opts,
    });
  }

  protected override defaultHat(_ctx: BuildContext): Widget3D | null {
    return new Hat({ style: 'helmet', color: 'darkMetal' });
  }
  protected override defaultShirt(_ctx: BuildContext): Widget3D | null {
    return new Shirt({ sleeveLength: 'sleeveless', color: 0x8a3a2a });
  }
  protected override defaultPants(_ctx: BuildContext): Widget3D | null {
    return new Pants({ length: 'long', color: 0x4a3422 });
  }
  protected override defaultBelt(_ctx: BuildContext): Widget3D | null {
    return new Belt({ width: 0.06, color: 'darkMetal', buckleColor: 'lightMetal' });
  }
  protected override defaultShoes(_ctx: BuildContext): Widget3D | null {
    return new Shoes({ style: 'boot', color: 0x2a1f15 });
  }
}

export default widgetToAssetModule(
  'hero-warrior',
  {
    kind: 'character',
    archetype: 'biped',
    name: 'Warrior',
    description: 'Broad-build humanoid with helmet, leather armor, sword, and shield.',
  },
  new Warrior(),
);
