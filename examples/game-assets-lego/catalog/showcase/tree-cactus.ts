// Cactus — widget API.

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  MeshCyl,
  Palette,
  widgetToAssetModule,
} from '@lego';

const TRUNK_HEIGHT = 5;
const TRUNK_RADIUS = 0.7;
const ARM_LENGTH = 2.2;
const ARM_RADIUS = 0.35;

export class Cactus extends StatelessWidget3D {
  override build(ctx: BuildContext): Widget3D {
    const skin = Palette.color(ctx, 'skin', 'green');
    const mat = { name: 'ground' as const, opts: { color: skin } };

    return new Stack3D({
      name: 'cactus',
      children: [
        new MeshCyl({
          rt: TRUNK_RADIUS * 0.85, rb: TRUNK_RADIUS, h: TRUNK_HEIGHT, rs: 8,
          deformOrganic: { amount: 0.06, seed: 23 },
          at: [0, TRUNK_HEIGHT / 2, 0],
          material: mat,
          tag: 'trunk',
        }),
        new Stack3D({
          name: 'arms',
          children: [
            new MeshCyl({
              rt: ARM_RADIUS, rb: ARM_RADIUS, h: ARM_LENGTH * 0.5, rs: 8,
              at: [TRUNK_RADIUS * 0.6, TRUNK_HEIGHT * 0.65, 0],
              rot: [0, 0, Math.PI / 2],
              material: mat, tag: 'armR_stub',
            }),
            new MeshCyl({
              rt: ARM_RADIUS * 0.85, rb: ARM_RADIUS, h: ARM_LENGTH * 0.9, rs: 8,
              at: [TRUNK_RADIUS + ARM_LENGTH * 0.45, TRUNK_HEIGHT * 0.65 + ARM_LENGTH * 0.4, 0],
              material: mat, tag: 'armR_rise',
            }),
            new MeshCyl({
              rt: ARM_RADIUS, rb: ARM_RADIUS, h: ARM_LENGTH * 0.4, rs: 8,
              at: [-TRUNK_RADIUS * 0.6, TRUNK_HEIGHT * 0.78, 0],
              rot: [0, 0, Math.PI / 2],
              material: mat, tag: 'armL_stub',
            }),
            new MeshCyl({
              rt: ARM_RADIUS * 0.85, rb: ARM_RADIUS, h: ARM_LENGTH * 0.7, rs: 8,
              at: [-TRUNK_RADIUS - ARM_LENGTH * 0.35, TRUNK_HEIGHT * 0.78 + ARM_LENGTH * 0.3, 0],
              material: mat, tag: 'armL_rise',
            }),
          ],
        }),
      ],
    });
  }
}

export default widgetToAssetModule(
  'tree-cactus',
  {
    kind: 'environment',
    archetype: 'tree',
    name: 'Saguaro Cactus',
    description: 'Tall ribbed barrel trunk with two upturned arms — desert flora.',
  },
  new Cactus(),
);
