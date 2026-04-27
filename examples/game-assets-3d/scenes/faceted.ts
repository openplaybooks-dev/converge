// Faceted preview scene — shows the same set of widgets twice, side by side:
// LEFT: normal smooth-shaded look. RIGHT: same widgets wrapped in Faceted,
// flat-shaded (Quaternius / hextantstudios "low-poly shader" aesthetic).
//
// Widgets exercised:
//   - Procedural: Hero (our 73-bone composite), Pine tree
//   - glTF imports: KayKit Knight, Cube Pet tiger
//
// Open at /viewer/scene.html?slug=faceted

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  Faceted, GltfModel, World,
  widgetToAssetModule,
} from '@lego';
import { Hero } from '../catalog/showcase/hero.js';
import { Pine } from '../catalog/nature/tree-pine.js';

class FacetedPreview extends StatelessWidget3D {
  override build(_ctx: BuildContext): Widget3D {
    // The lineup repeated twice: smooth on the left, faceted on the right.
    const lineup = (label: string, faceted: boolean) => {
      const items: Widget3D[] = [
        new Stack3D({
          at: [0, 0, 0],
          children: [new Hero()],
          key: `${label}_hero`,
        }),
        new Stack3D({
          at: [3, 0, 0],
          children: [new Pine()],
          key: `${label}_pine`,
        }),
        new Stack3D({
          at: [6, 0, 0],
          children: [new GltfModel({
            asset: '/assets/characters/knight.glb',
            animation: 'Idle',
          })],
          key: `${label}_knight`,
        }),
        new Stack3D({
          at: [9, 0, 0],
          scale: 1.5,
          children: [new GltfModel({
            asset: '/assets/kenney/cube-pets/animal-tiger.glb',
            animation: 'idle',
          })],
          key: `${label}_tiger`,
        }),
      ];

      const stack = new Stack3D({
        name: label,
        at: [faceted ? 1.5 : -10.5, 0, 0],
        children: items,
        key: label,
      });

      return faceted
        ? new Faceted({
            // Strip textures so the imported glTFs show pure faceted color.
            stripTextures: true,
            name: 'faceted_wrap',
            child: stack,
          })
        : stack;
    };

    return new World({
      daynight: { staticPhase: 'midday' },
      child: new Stack3D({
        name: 'faceted-preview',
        children: [
          lineup('smooth', false),
          lineup('faceted', true),
        ],
      }),
    });
  }
}

export default widgetToAssetModule(
  'faceted',
  {
    kind: 'environment',
    name: 'Faceted style preview',
    description: 'Same lineup twice: left smooth, right faceted (flat-shaded). Hero, Pine, KayKit Knight, Cube Pet tiger.',
  },
  new FacetedPreview(),
);
