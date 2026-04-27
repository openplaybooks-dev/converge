// Crowd — showcase of widget customization for variants. Five characters in
// a row, each demonstrating a different combination of Palette overrides and
// variant subclasses (Hero / Warrior / Mage). Same widget tree, different
// contexts and overrides.

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  Palette,
  widgetToAssetModule,
} from '@lego';
import type { ColorInput } from '@lego';
import { Hero } from './hero.js';
import { Warrior } from './hero-warrior.js';
import { Mage } from './hero-mage.js';

interface CrowdEntry {
  palette: Record<string, ColorInput>;
  build: () => Widget3D;
}

const ENTRIES: CrowdEntry[] = [
  // Default Hero in muted forest tones.
  { palette: { skin: 'brick', shirt: 'pineGreen', pants: 'rockGrey', hair: 0x3a2818, shoes: 0x2a1f15 },
    build: () => new Hero() },
  // Warrior with leather + metal.
  { palette: { skin: 0xe2b88a, hair: 0x2a1500, armor: 'darkMetal' },
    build: () => new Warrior() },
  // Civilian with cyan shirt.
  { palette: { skin: 0xb88a5e, shirt: 'water', pants: 'pineWood', hair: 0x101010, shoes: 0x1a1812 },
    build: () => new Hero() },
  // Thinner build with red shirt.
  { palette: { skin: 0x9a6438, shirt: 'fireRed', pants: 'chimneyGrey', hair: 0x4a2818, shoes: 'darkMetal' },
    build: () => new Hero({ build: 'thin' }) },
  // Mage in robes.
  { palette: { skin: 0xd4a280, hair: 0x6a4a2a },
    build: () => new Mage() },
];

export class Crowd extends StatelessWidget3D {
  override build(_ctx: BuildContext): Widget3D {
    const SPACING = 1.6;
    const half = ((ENTRIES.length - 1) * SPACING) / 2;

    return new Stack3D({
      name: 'crowd',
      children: ENTRIES.map((entry, i) =>
        new Palette({
          colors: entry.palette,
          child: new Stack3D({
            at: [i * SPACING - half, 0, 0],
            children: [entry.build()],
            key: `entry_${i}`,
          }),
        })
      ),
    });
  }
}

export default widgetToAssetModule(
  'crowd',
  {
    kind: 'character',
    archetype: 'biped',
    name: 'Crowd',
    description: 'Five characters: Hero × 3 (default + cyan + thin) + Warrior + Mage. Each in its own Palette context.',
  },
  new Crowd(),
);
