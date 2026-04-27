// Cloud — widget API.

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  MeshBox,
  Palette,
  widgetToAssetModule,
} from '@lego';

const BLOCK_SIZE = 1.6;
const BLOCK_LAYOUT: Array<[number, number, number, number, number]> = [
  [-1.8, 0.0, 0.2, 0.85, 0.4],
  [-0.6, 0.4, -0.3, 0.95, 1.2],
  [ 0.6, 0.1,  0.4, 0.80, 0.7],
  [ 1.7, 0.3, -0.1, 0.70, 2.1],
  [-0.2, 0.6,  0.6, 0.55, 1.6],
];

export class Cloud extends StatelessWidget3D {
  override build(ctx: BuildContext): Widget3D {
    const color = Palette.color(ctx, 'cloud', 'white');
    return new Stack3D({
      name: 'cloud',
      children: [
        new Stack3D({
          name: 'blocks',
          children: BLOCK_LAYOUT.map(([x, y, z, s, ry], i) =>
            new MeshBox({
              w: BLOCK_SIZE * s, h: BLOCK_SIZE * s, d: BLOCK_SIZE * s,
              at: [x, y, z],
              rot: [0, ry, ry * 0.3],
              material: { name: 'toon', opts: { color } },
              tag: `block_${i}`,
              key: `block_${i}`,
            })
          ),
        }),
      ],
    });
  }
}

export default widgetToAssetModule(
  'cloud',
  {
    kind: 'environment',
    archetype: 'cloud',
    name: 'Cloud',
    description: 'Cluster of soft white blocks reading as a fluffy cumulus.',
  },
  new Cloud(),
);
