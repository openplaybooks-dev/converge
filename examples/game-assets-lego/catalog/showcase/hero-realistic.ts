// Hero (realistic) — async-loads a low-poly cartoon humanoid (KayKit Knight,
// CC0) and plays its built-in Idle animation.
//
// KayKit Adventurer pack ships 76 animations; the most useful are:
// 'Idle', 'Walking_A', 'Walking_B', 'Walking_Backwards',
// 'Running_A', 'Running_B', 'Jump_Full_Long', 'Cheer',
// '1H_Melee_Attack_Chop', '2H_Melee_Attack_Spin', 'Block', etc.

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  RealisticBody,
  widgetToAssetModule,
} from '@lego';

const KNIGHT_ASSET = '/assets/characters/knight.glb';

export interface HeroRealisticOpts {
  /** Animation name from the KayKit Adventurer pack. Default 'Idle'. */
  animation?: string;
  /** Asset path. Default = Knight; supply a sister .glb (Barbarian/Mage/Rogue) to swap class. */
  asset?: string;
  /** Uniform scale (KayKit characters are ~2-unit tall; usually 1.0 is fine). */
  scale?: number;
  key?: string;
}

export class HeroRealistic extends StatelessWidget3D {
  private readonly o: HeroRealisticOpts;
  constructor(opts: HeroRealisticOpts = {}) {
    super({ key: opts.key });
    this.o = opts;
  }
  override build(_ctx: BuildContext): Widget3D {
    return new Stack3D({
      name: 'hero-realistic',
      children: [
        new RealisticBody({
          asset: this.o.asset ?? KNIGHT_ASSET,
          animation: this.o.animation ?? 'Idle',
          scale: this.o.scale ?? 1.0,
          castShadow: true,
          receiveShadow: true,
        }),
      ],
    });
  }
}

export default widgetToAssetModule(
  'hero-realistic',
  {
    kind: 'character',
    archetype: 'biped',
    name: 'Hero (Realistic)',
    description: 'CC0 low-poly cartoon humanoid (KayKit Knight) with 76 baked animations. Plays Idle by default.',
  },
  new HeroRealistic(),
);
