// Dungeon scene — composed entirely of KayKit CC0 assets to demonstrate
// the all-CC0 indie-game style. A 5x5 stone-tile floor, walls around three
// sides, the Knight in the center, four Skeleton enemies in the corners,
// and a few props (chests, barrels, candles, columns).

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  GltfModel, World,
  widgetToAssetModule,
} from '@lego';

const TILE = 2.0; // KayKit dungeon floor tiles are ~2x2 units
const GRID = 5;   // 5x5 floor

class Dungeon extends StatelessWidget3D {
  override build(_ctx: BuildContext): Widget3D {
    // Floor grid
    const floorTiles: Widget3D[] = [];
    for (let x = 0; x < GRID; x++) {
      for (let z = 0; z < GRID; z++) {
        floorTiles.push(new Stack3D({
          at: [(x - (GRID - 1) / 2) * TILE, 0, (z - (GRID - 1) / 2) * TILE],
          children: [
            new GltfModel({ asset: '/assets/dungeon/floor_tile_large.glb' }),
          ],
          key: `floor_${x}_${z}`,
        }));
      }
    }

    // Wall ring on north, east, west sides
    const walls: Widget3D[] = [];
    for (let i = 0; i < GRID; i++) {
      const offset = (i - (GRID - 1) / 2) * TILE;
      // North wall
      walls.push(new Stack3D({
        at: [offset, 0, -GRID / 2 * TILE],
        children: [new GltfModel({ asset: '/assets/dungeon/wall.glb' })],
        key: `wall_n_${i}`,
      }));
      // West wall
      walls.push(new Stack3D({
        at: [-GRID / 2 * TILE, 0, offset],
        rot: [0, Math.PI / 2, 0],
        children: [new GltfModel({ asset: '/assets/dungeon/wall.glb' })],
        key: `wall_w_${i}`,
      }));
      // East wall
      walls.push(new Stack3D({
        at: [GRID / 2 * TILE, 0, offset],
        rot: [0, -Math.PI / 2, 0],
        children: [new GltfModel({ asset: '/assets/dungeon/wall.glb' })],
        key: `wall_e_${i}`,
      }));
    }

    return new World({
      daynight: { staticPhase: 'midday' },
      child: new Stack3D({
        name: 'dungeon',
        children: [
          new Stack3D({ name: 'floor', children: floorTiles }),
          new Stack3D({ name: 'walls', children: walls }),

          // Hero: Knight in the center, idle
          new Stack3D({
            at: [0, 0, 0],
            children: [
              new GltfModel({
                asset: '/assets/characters/knight.glb',
                animation: 'Idle',
              }),
            ],
            key: 'hero',
          }),

          // Four skeleton enemies in the corners, facing inward
          new Stack3D({
            at: [-3, 0, -3],
            rot: [0, Math.PI / 4, 0],
            children: [new GltfModel({
              asset: '/assets/characters/skeleton_warrior.glb',
              animation: 'Idle',
            })],
            key: 'enemy_nw',
          }),
          new Stack3D({
            at: [3, 0, -3],
            rot: [0, -Math.PI / 4, 0],
            children: [new GltfModel({
              asset: '/assets/characters/skeleton_mage.glb',
              animation: 'Idle',
            })],
            key: 'enemy_ne',
          }),
          new Stack3D({
            at: [-3, 0, 3],
            rot: [0, Math.PI * 3 / 4, 0],
            children: [new GltfModel({
              asset: '/assets/characters/skeleton_rogue.glb',
              animation: 'Idle',
            })],
            key: 'enemy_sw',
          }),
          new Stack3D({
            at: [3, 0, 3],
            rot: [0, -Math.PI * 3 / 4, 0],
            children: [new GltfModel({
              asset: '/assets/characters/skeleton_minion.glb',
              animation: 'Idle',
            })],
            key: 'enemy_se',
          }),

          // Props
          new Stack3D({
            at: [-3.5, 0, 0],
            children: [new GltfModel({ asset: '/assets/dungeon/chest_gold.glb' })],
            key: 'chest',
          }),
          new Stack3D({
            at: [3.5, 0, 0],
            children: [new GltfModel({ asset: '/assets/dungeon/barrel_large.glb' })],
            key: 'barrel',
          }),
          new Stack3D({
            at: [-3.8, 0, -3.8],
            children: [new GltfModel({ asset: '/assets/dungeon/column.glb' })],
            key: 'col_nw',
          }),
          new Stack3D({
            at: [3.8, 0, -3.8],
            children: [new GltfModel({ asset: '/assets/dungeon/column.glb' })],
            key: 'col_ne',
          }),
          new Stack3D({
            at: [-3.8, 0, 3.8],
            children: [new GltfModel({ asset: '/assets/dungeon/column.glb' })],
            key: 'col_sw',
          }),
          new Stack3D({
            at: [3.8, 0, 3.8],
            children: [new GltfModel({ asset: '/assets/dungeon/column.glb' })],
            key: 'col_se',
          }),
          new Stack3D({
            at: [-2, 0.5, -3.5],
            children: [new GltfModel({ asset: '/assets/dungeon/candle_thin_lit.glb' })],
            key: 'candle_l',
          }),
          new Stack3D({
            at: [2, 0.5, -3.5],
            children: [new GltfModel({ asset: '/assets/dungeon/candle_thin_lit.glb' })],
            key: 'candle_r',
          }),
        ],
      }),
    });
  }
}

export default widgetToAssetModule(
  'dungeon',
  {
    kind: 'environment',
    name: 'Dungeon (KayKit)',
    description: '5x5 stone-tile dungeon room with Knight + 4 skeleton enemies and props. All KayKit CC0 assets.',
  },
  new Dungeon(),
);
