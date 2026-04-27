// Island — homestead scene composed in the widget API.
//
// Recreates the upstream feel of interactive-low-poly-environment:
// a fenced home zone with a house, lampposts, benches, and a carousel,
// surrounded by scattered trees and stones, with a lake on one edge,
// fireflies hovering, and a campfire at night.
//
// All widgets compose declaratively — the scene is just one big build()
// returning a Stack3D of catalog widgets at scene-scale positions.

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  Palette, Seed, World,
  widgetToAssetModule,
} from '@lego';
import { Pine } from '../catalog/nature/tree-pine.js';
import { Oak } from '../catalog/nature/tree-oak.js';
import { Stone } from '../catalog/nature/stone.js';
import { GrassClump } from '../catalog/nature/grass-clump.js';
import { Lake } from '../catalog/nature/lake.js';
import { Cloud } from '../catalog/nature/cloud.js';
import { House } from '../catalog/architecture/house.js';
import { LampPost } from '../catalog/architecture/lamppost.js';
import { Bench } from '../catalog/architecture/bench.js';
import { InternalFence } from '../catalog/architecture/internal-fence.js';
import { Carousel } from '../catalog/effects/carousel.js';
import { Campfire } from '../catalog/effects/campfire.js';
import { FireflyColony } from '../catalog/effects/fireflies.js';

const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

class Island extends StatelessWidget3D {
  override build(_ctx: BuildContext): Widget3D {
    return new Stack3D({
      name: 'island',
      children: [
        // ── Lake on the west edge ──
        new Stack3D({
          at: [-50, 0, 30],
          children: [new Lake()],
        }),

        // ── Fenced homestead ring (50×50 zone) ──
        new InternalFence({ boundary: 25, doorGapSegments: 1 }),

        // ── House inside the homestead ──
        new Stack3D({
          at: [10, 0, -8],
          rot: [0, -Math.PI / 4 - Math.PI / 2, 0],
          children: [new House()],
        }),

        // ── Carousel inside the homestead ──
        new Stack3D({
          at: [-12, 0, 8],
          children: [new Carousel()],
        }),

        // ── Two benches at the edge of the home zone ──
        new Stack3D({
          at: [12, 0, 12],
          children: [new Bench()],
        }),
        new Stack3D({
          at: [18, 0, 5],
          rot: [0, Math.PI / 2, 0],
          children: [new Bench()],
        }),

        // ── Campfire south of the carousel ──
        new Stack3D({
          at: [-8, 0, 18],
          scale: 0.5,
          children: [new Campfire()],
        }),

        // ── Fireflies above the campfire ──
        new Stack3D({
          at: [-8, 6, 18],
          children: [new FireflyColony({ count: 30, extent: [10, 4, 10], seed: 7777 })],
        }),

        // ── Outer trees: scattered pines + oaks around the perimeter ──
        new Stack3D({
          name: 'outer-forest',
          children: range(18).map((i) => {
            const angle = (i / 18) * Math.PI * 2;
            const r = 38 + (i % 3) * 4; // ring with slight thickness
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;
            const isPine = i % 2 === 0;
            return new Seed({
              value: 1000 + i * 31,
              child: new Stack3D({
                at: [x, 0, z],
                children: [isPine ? new Pine() : new Oak()],
                key: `tree_${i}`,
              }),
            });
          }),
        }),

        // ── Stones scattered around ──
        new Stack3D({
          name: 'stones',
          children: range(8).map((i) => {
            const angle = (i / 8) * Math.PI * 2 + 0.4;
            const r = 32;
            return new Seed({
              value: 5000 + i * 17,
              child: new Stack3D({
                at: [Math.cos(angle) * r, 0, Math.sin(angle) * r],
                children: [new Stone()],
                key: `stone_${i}`,
              }),
            });
          }),
        }),

        // ── Grass tufts ──
        new Stack3D({
          name: 'grass',
          children: range(20).map((i) => {
            // Pseudo-random scatter using sin hash.
            const x = Math.sin(i * 12.9898) * 30;
            const z = Math.cos(i * 78.233) * 30;
            return new Seed({
              value: 7000 + i * 11,
              child: new Stack3D({
                at: [x, 0, z],
                children: [new GrassClump()],
                key: `grass_${i}`,
              }),
            });
          }),
        }),

        // ── Clouds drifting overhead ──
        new Stack3D({
          name: 'clouds',
          children: range(5).map((i) =>
            new Stack3D({
              at: [-30 + i * 15, 25, -20 + i * 8],
              scale: 1.5,
              children: [new Cloud({ key: `cloud_${i}` })],
            })
          ),
        }),
      ],
    });
  }
}

// Sky-blue palette for the whole island.
const islandWithPalette = new Palette({
  colors: { sky: 0x9ed4f0 },
  child: new Island(),
});

// Tags for lights that should turn on at night. The InternalFence's two
// lamp posts get instance IDs 0 and 1; the standalone campfire is 0.
const islandNightLights = [
  // Up to 8 lamppost instances covered (we have 2; rest are no-ops).
  ...Array.from({ length: 8 }, (_, i) => `lamp_spot_${i}`),
  ...Array.from({ length: 8 }, (_, i) => `lamp_point_${i}`),
  ...Array.from({ length: 4 }, (_, i) => `campfire_light_${i}`),
];

const islandWorld = new World({
  daynight: {
    cyclePeriod: 60,         // 60s for a full day cycle
    startPhase: 'midday',
    nightLights: islandNightLights,
    nightEffects: [],
  },
  fog: { near: 80, far: 250 },
  child: islandWithPalette,
});

export default widgetToAssetModule(
  'island',
  {
    name: 'Island',
    description: 'Homestead island with cycling day/night lighting (60s cycle), fog, lit lampposts at night, surrounding forest, lake, and clouds.',
  },
  islandWorld,
);
