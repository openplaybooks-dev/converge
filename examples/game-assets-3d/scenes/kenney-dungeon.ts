// Kenney Mini Dungeon scene — simplest blockiest CC0 indie style. Mirrors
// the structure of scenes/dungeon.ts but uses Kenney Mini Dungeon assets
// for floors, walls, and props plus character-human + character-orc as
// hero/enemy.

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  GltfModel, World,
  widgetToAssetModule,
} from '@lego';

const TILE = 1.0; // Kenney Mini tiles are ~1x1 unit
const GRID = 6;

class KenneyDungeon extends StatelessWidget3D {
  override build(_ctx: BuildContext): Widget3D {
    const floorTiles: Widget3D[] = [];
    for (let x = 0; x < GRID; x++) {
      for (let z = 0; z < GRID; z++) {
        floorTiles.push(new Stack3D({
          at: [(x - (GRID - 1) / 2) * TILE, 0, (z - (GRID - 1) / 2) * TILE],
          children: [
            new GltfModel({ asset: '/assets/kenney/mini-dungeon/floor.glb' }),
          ],
          key: `floor_${x}_${z}`,
        }));
      }
    }

    const walls: Widget3D[] = [];
    for (let i = 0; i < GRID; i++) {
      const offset = (i - (GRID - 1) / 2) * TILE;
      walls.push(new Stack3D({
        at: [offset, 0, -GRID / 2 * TILE],
        children: [new GltfModel({ asset: '/assets/kenney/mini-dungeon/wall.glb' })],
        key: `wall_n_${i}`,
      }));
      walls.push(new Stack3D({
        at: [-GRID / 2 * TILE, 0, offset],
        rot: [0, Math.PI / 2, 0],
        children: [new GltfModel({ asset: '/assets/kenney/mini-dungeon/wall.glb' })],
        key: `wall_w_${i}`,
      }));
      walls.push(new Stack3D({
        at: [GRID / 2 * TILE, 0, offset],
        rot: [0, -Math.PI / 2, 0],
        children: [new GltfModel({ asset: '/assets/kenney/mini-dungeon/wall.glb' })],
        key: `wall_e_${i}`,
      }));
    }

    return new World({
      daynight: { staticPhase: 'midday' },
      child: new Stack3D({
        name: 'kenney-dungeon',
        children: [
          new Stack3D({ name: 'floor', children: floorTiles }),
          new Stack3D({ name: 'walls', children: walls }),

          // Hero
          new Stack3D({
            at: [0, 0, 0],
            children: [new GltfModel({
              asset: '/assets/kenney/mini-dungeon/character-human.glb',
            })],
            key: 'hero',
          }),

          // Three orc enemies
          new Stack3D({
            at: [-2, 0, -2],
            rot: [0, Math.PI / 4, 0],
            children: [new GltfModel({
              asset: '/assets/kenney/mini-dungeon/character-orc.glb',
            })],
            key: 'orc_nw',
          }),
          new Stack3D({
            at: [2, 0, -2],
            rot: [0, -Math.PI / 4, 0],
            children: [new GltfModel({
              asset: '/assets/kenney/mini-dungeon/character-orc.glb',
            })],
            key: 'orc_ne',
          }),
          new Stack3D({
            at: [0, 0, 2.5],
            rot: [0, Math.PI, 0],
            children: [new GltfModel({
              asset: '/assets/kenney/mini-dungeon/character-orc.glb',
            })],
            key: 'orc_s',
          }),

          // Props
          new Stack3D({
            at: [-1.5, 0, 0],
            children: [new GltfModel({ asset: '/assets/kenney/mini-dungeon/chest.glb' })],
            key: 'chest',
          }),
          new Stack3D({
            at: [1.5, 0, 0],
            children: [new GltfModel({ asset: '/assets/kenney/mini-dungeon/barrel.glb' })],
            key: 'barrel',
          }),
          new Stack3D({
            at: [-2.5, 0, -2.5],
            children: [new GltfModel({ asset: '/assets/kenney/mini-dungeon/column.glb' })],
            key: 'col_nw',
          }),
          new Stack3D({
            at: [2.5, 0, -2.5],
            children: [new GltfModel({ asset: '/assets/kenney/mini-dungeon/column.glb' })],
            key: 'col_ne',
          }),
          new Stack3D({
            at: [-2.5, 0, 2.5],
            children: [new GltfModel({ asset: '/assets/kenney/mini-dungeon/column.glb' })],
            key: 'col_sw',
          }),
          new Stack3D({
            at: [2.5, 0, 2.5],
            children: [new GltfModel({ asset: '/assets/kenney/mini-dungeon/column.glb' })],
            key: 'col_se',
          }),
          new Stack3D({
            at: [-0.7, 0, -2.7],
            children: [new GltfModel({ asset: '/assets/kenney/mini-dungeon/banner.glb' })],
            key: 'banner_l',
          }),
          new Stack3D({
            at: [0.7, 0, -2.7],
            children: [new GltfModel({ asset: '/assets/kenney/mini-dungeon/banner.glb' })],
            key: 'banner_r',
          }),
        ],
      }),
    });
  }
}

export default widgetToAssetModule(
  'kenney-dungeon',
  {
    kind: 'environment',
    name: 'Dungeon (Kenney Mini)',
    description: '6x6 blocky dungeon with chibi human + 3 orc enemies. Kenney Mini Dungeon CC0 — the simplest indie style.',
  },
  new KenneyDungeon(),
);
