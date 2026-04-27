// Town — multiple houses + benches + lampposts + a small crowd. Showcases
// how the same House widget can be rendered in different palettes side by
// side (Flutter-style theming), and how the Crowd widget composes Hero
// instances each in its own outfit.

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  Palette, World,
  widgetToAssetModule,
} from '@lego';
import type { ColorInput } from '@lego';
import { House } from '../catalog/architecture/house.js';
import { LampPost } from '../catalog/architecture/lamppost.js';
import { Bench } from '../catalog/architecture/bench.js';
import { Fence } from '../catalog/architecture/fence.js';
import { Crowd } from '../catalog/showcase/crowd.js';
import { Pine } from '../catalog/nature/tree-pine.js';
import { Cloud } from '../catalog/nature/cloud.js';

class Town extends StatelessWidget3D {
  override build(_ctx: BuildContext): Widget3D {
    const HOUSES: Array<{ x: number; z: number; palette: Record<string, ColorInput> }> = [
      { x: -25, z: -10, palette: { wall: 'brownBrick', roof: 'redBrick' } },
      { x:   0, z: -10, palette: { wall: 0x8b6f3f, roof: 'redBrick' } },
      { x:  25, z: -10, palette: { wall: 0x6f5a3f, roof: 0x4a4a52 } },
      { x: -15, z:  20, palette: { wall: 0x9a8060, roof: 'redBrick' } },
      { x:  15, z:  20, palette: { wall: 'brownBrick', roof: 0x4a4a52 } },
    ];

    return new Stack3D({
      name: 'town',
      children: [
        // 5 houses in a small village layout — each with its own Palette.
        new Stack3D({
          name: 'houses',
          children: HOUSES.map((h, i) =>
            new Palette({
              colors: h.palette,
              child: new Stack3D({
                at: [h.x, 0, h.z],
                rot: [0, h.x > 0 ? -Math.PI / 4 : Math.PI / 4, 0],
                children: [new House()],
                key: `house_${i}`,
              }),
              key: `house_palette_${i}`,
            })
          ),
        }),

        // Lampposts along the central road.
        new Stack3D({
          name: 'lampposts',
          children: [-30, -10, 10, 30].map((x, i) =>
            new Stack3D({
              at: [x, 0, 5],
              children: [new LampPost({ key: `lamp_${i}` })],
            })
          ),
        }),

        // Two benches facing the central road.
        new Stack3D({ at: [-5, 0, 8], children: [new Bench()] }),
        new Stack3D({ at: [ 5, 0, 8], children: [new Bench()] }),

        // Picket fence segments at the edges of each house plot.
        new Stack3D({
          name: 'fences',
          children: HOUSES.map((h, i) =>
            new Stack3D({
              at: [h.x, 0, h.z + 12],
              children: [new Fence({ segments: 1, key: `fence_${i}` })],
            })
          ),
        }),

        // Crowd of villagers in front of the central house.
        new Stack3D({
          at: [0, 0, 5],
          children: [new Crowd()],
        }),

        // Decorative trees between houses.
        new Stack3D({
          name: 'trees',
          children: [-20, -10, 0, 10, 20, 30, -30].map((x, i) =>
            new Stack3D({
              at: [x, 0, 35],
              children: [new Pine({ trunkH: 6 + (i % 3), seed: 100 + i, key: `tree_${i}` })],
            })
          ),
        }),

        // Clouds.
        new Stack3D({
          name: 'clouds',
          children: [-30, 0, 30].map((x, i) =>
            new Stack3D({
              at: [x, 30, -25 + i * 10],
              scale: 1.4,
              children: [new Cloud({ key: `cloud_${i}` })],
            })
          ),
        }),
      ],
    });
  }
}

export default widgetToAssetModule(
  'town',
  {
    name: 'Town',
    description: 'Five houses in mixed palettes along a central road. Sunset lighting with warm sun + shadows.',
  },
  new World({
    daynight: { staticPhase: 'sunset' },
    fog: { near: 60, far: 220 },
    child: new Town(),
  }),
);
