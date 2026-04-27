// Forest — 9-species mixed woodland with autumn band, graveyard zone, and
// lake. Demonstrates the tree toolkit at scene scale.

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  Seed, World,
  widgetToAssetModule,
} from '@lego';
import { Pine } from '../catalog/nature/tree-pine.js';
import { BarePine } from '../catalog/nature/tree-pine-bare.js';
import { AutumnPine } from '../catalog/nature/tree-pine-autumn.js';
import { Oak } from '../catalog/nature/tree-oak.js';
import { BareOak } from '../catalog/nature/tree-oak-bare.js';
import { AutumnOak } from '../catalog/nature/tree-oak-autumn.js';
import { Birch } from '../catalog/nature/tree-birch.js';
import { BareBirch } from '../catalog/nature/tree-birch-bare.js';
import { AutumnBirch } from '../catalog/nature/tree-birch-autumn.js';
import { Fir } from '../catalog/nature/tree-fir.js';
import { BareFir } from '../catalog/nature/tree-fir-bare.js';
import { AutumnFir } from '../catalog/nature/tree-fir-autumn.js';
import { Willow } from '../catalog/nature/tree-willow.js';
import { BareWillow } from '../catalog/nature/tree-willow-bare.js';
import { AutumnWillow } from '../catalog/nature/tree-willow-autumn.js';
import { Sakura } from '../catalog/nature/tree-sakura.js';
import { BareSakura } from '../catalog/nature/tree-sakura-bare.js';
import { AutumnSakura } from '../catalog/nature/tree-sakura-autumn.js';
import { Bush } from '../catalog/nature/tree-bush.js';
import { BareBush } from '../catalog/nature/tree-bush-bare.js';
import { AutumnBush } from '../catalog/nature/tree-bush-autumn.js';
import { Sapling } from '../catalog/nature/tree-sapling.js';
import { BareSapling } from '../catalog/nature/tree-sapling-bare.js';
import { Dead } from '../catalog/nature/tree-dead.js';
import { Stone } from '../catalog/nature/stone.js';
import { GrassClump } from '../catalog/nature/grass-clump.js';
import { Lake } from '../catalog/nature/lake.js';
import { Cloud } from '../catalog/nature/cloud.js';

const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

// Deterministic 2D hash for stable scatter.
function hash(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt) * 43758.5453;
  return x - Math.floor(x);
}

// Species roulette — weights sum to 1.0.
interface SpeciesEntry {
  weight: number;
  leafy: () => Widget3D;
  bare: () => Widget3D;
  autumn: () => Widget3D;
}

const SPECIES: SpeciesEntry[] = [
  { weight: 0.22, leafy: () => new Pine(),    bare: () => new BarePine(),    autumn: () => new AutumnPine() },
  { weight: 0.16, leafy: () => new Oak(),     bare: () => new BareOak(),     autumn: () => new AutumnOak() },
  { weight: 0.14, leafy: () => new Birch(),   bare: () => new BareBirch(),   autumn: () => new AutumnBirch() },
  { weight: 0.10, leafy: () => new Fir(),     bare: () => new BareFir(),     autumn: () => new AutumnFir() },
  { weight: 0.08, leafy: () => new Sakura(),  bare: () => new BareSakura(),  autumn: () => new AutumnSakura() },
  { weight: 0.07, leafy: () => new Willow(),  bare: () => new BareWillow(),  autumn: () => new AutumnWillow() },
  { weight: 0.07, leafy: () => new Sapling(), bare: () => new BareSapling(), autumn: () => new Sapling() },
  { weight: 0.06, leafy: () => new Bush(),    bare: () => new BareBush(),    autumn: () => new AutumnBush() },
  { weight: 0.05, leafy: () => new Dead(),    bare: () => new Dead(),        autumn: () => new Dead() },
  { weight: 0.05, leafy: () => new Pine(),    bare: () => new BarePine(),    autumn: () => new AutumnPine() }, // pad
];

function pickSpecies(r: number): SpeciesEntry {
  let acc = 0;
  for (const s of SPECIES) {
    acc += s.weight;
    if (r < acc) return s;
  }
  return SPECIES[0];
}

class Forest extends StatelessWidget3D {
  override build(_ctx: BuildContext): Widget3D {
    const TREE_COUNT = 36;
    const STONE_COUNT = 10;
    const GRASS_COUNT = 40;

    return new Stack3D({
      name: 'forest',
      children: [
        // Lake on the east edge.
        new Stack3D({
          at: [40, 0, -10],
          children: [new Lake()],
        }),

        // Trees — weighted species mix with autumn band + graveyard zone.
        new Stack3D({
          name: 'trees',
          children: range(TREE_COUNT).map((i) => {
            const x = (hash(i, 1) - 0.5) * 95;
            const z = (hash(i, 2) - 0.5) * 95;
            // Skip placements close to the lake.
            if (x > 25 && Math.abs(z + 10) < 12) return null;

            const inGraveyard = Math.hypot(x + 35, z - 30) < 10;
            const inAutumnBand = z > -8 && z < 18 && hash(i, 11) < 0.45;
            const inLakeArea = x > 15 && Math.abs(z + 10) < 18;

            let widget: Widget3D;
            if (inGraveyard) {
              widget = new Dead();
            } else if (inLakeArea && hash(i, 13) < 0.4) {
              // Willows favor water.
              widget = inAutumnBand ? new AutumnWillow() : new Willow();
            } else {
              const spec = pickSpecies(hash(i, 10));
              widget = inAutumnBand ? spec.autumn()
                : hash(i, 12) < 0.10 ? spec.bare()
                : spec.leafy();
            }
            return new Seed({
              value: 2000 + i * 23,
              child: new Stack3D({
                at: [x, 0, z],
                children: [widget],
                key: `tree_${i}`,
              }),
            });
          }).filter((w): w is NonNullable<typeof w> => w !== null),
        }),

        // Stones scattered.
        new Stack3D({
          name: 'stones',
          children: range(STONE_COUNT).map((i) => {
            const x = (hash(i, 6) - 0.5) * 80;
            const z = (hash(i, 7) - 0.5) * 80;
            return new Seed({
              value: 6000 + i * 41,
              child: new Stack3D({
                at: [x, 0, z],
                children: [new Stone()],
                key: `stone_${i}`,
              }),
            });
          }),
        }),

        // Grass tufts.
        new Stack3D({
          name: 'grass',
          children: range(GRASS_COUNT).map((i) => {
            const x = (hash(i, 8) - 0.5) * 90;
            const z = (hash(i, 9) - 0.5) * 90;
            return new Seed({
              value: 8000 + i * 13,
              child: new Stack3D({
                at: [x, 0, z],
                children: [new GrassClump()],
                key: `grass_${i}`,
              }),
            });
          }),
        }),

        // Clouds.
        new Stack3D({
          name: 'clouds',
          children: range(4).map((i) =>
            new Stack3D({
              at: [-30 + i * 20, 28, -20 + i * 5],
              scale: 1.5,
              children: [new Cloud({ key: `cloud_${i}` })],
            })
          ),
        }),
      ],
    });
  }
}

export default widgetToAssetModule(
  'forest',
  {
    name: 'Forest',
    description: '9-species mixed forest: pine/oak/birch/fir/sakura/willow/bush/sapling/dead. Autumn band in the center, dead-tree graveyard at SW, willows near the lake.',
  },
  new World({
    daynight: { staticPhase: 'midday' },
    fog: { near: 80, far: 280 },
    child: new Forest(),
  }),
);
