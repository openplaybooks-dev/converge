// Carousel — ported from interactive-low-poly-environment's `Carousel`
// (Roberto Nacu, MIT). Rug + base + central column + 3 cross-arms with 6
// ferry pods, the arms group rotates and bobs.
//
// Original: js/main.js:5050. Upstream's ferry pods are detailed (6-sided
// cylinder frame + circle seat + 4-sided pyramidal cover with vertex-color
// gradient). We ship a simplified pod that reads correctly at distance: a
// short cylinder body + a cone cover. Ropes are omitted (they're THREE.Line
// in upstream and don't contribute much silhouette).

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  MeshCyl, MeshBox, MeshCone,
  Palette,
  BoneOscillate, BoneBob,
  widgetToAssetModule,
} from '@lego';

class Ferry extends StatelessWidget3D {
  override build(ctx: BuildContext): Widget3D {
    const metal = Palette.color(ctx, 'metal', 'lightMetal');
    const dark = Palette.color(ctx, 'dark', 'darkMetal');
    const cover = Palette.color(ctx, 'pastel', 'carouselPastel');

    return new Stack3D({
      name: 'ferry',
      children: [
        // Frame — short open-top cylinder.
        new MeshCyl({
          rt: 18.5 * 0.2, rb: 18.5 * 0.2, h: 20 * 0.2, rs: 6,
          at: [0, 2 * 0.2, 0],
          material: { name: 'phong', opts: { color: metal, shininess: 110, specular: 0x121212, flatShading: true } },
          tag: 'frame',
        }),
        // Connecting log up to the arm.
        new MeshBox({
          w: 2 * 0.2, h: 13 * 0.2, d: 2 * 0.2,
          at: [0, 12.5 * 0.2, 0],
          material: { name: 'phong', opts: { color: dark, shininess: 110, specular: 0x121212 } },
          tag: 'log',
        }),
        // Cover — pyramidal cone with HSL vertex gradient (lighter at apex,
        // darker at base) matching upstream's cover shading.
        new MeshCone({
          r: 22 * 0.2, h: 10 * 0.2, rs: 4,
          at: [0, 24 * 0.2, 0],
          // Upstream: H=0.61, S=0.31, L = y/10 + 1 (yLocal in their cone of h=10).
          // Our cone has h=2 so yNorm is the [0..1] mapped param to convert to.
          vertexColorHSL: {
            h: 0.61,
            s: 0.31,
            l: (yNorm) => 0.55 + yNorm * 0.35,
          },
          material: { name: 'phong', opts: { color: 0xffffff, shininess: 120, specular: 0x121212, flatShading: true, vertexColors: true } },
          tag: 'cover',
        }),
      ],
    });
  }
}

const FERRY_POSITIONS: Array<[number, number]> = [
  [-2.4, 16.6],
  [2.4, -16.6],
  [-13.8, -9.8],
  [-13.8, 4],
  [13.8, 9.8],
  [13.8, -4],
];

const ARM_ROTATIONS = [Math.PI / 2, Math.PI / 6, -Math.PI / 6];

export class Carousel extends StatelessWidget3D {
  override build(ctx: BuildContext): Widget3D {
    const metal = Palette.color(ctx, 'metal', 'lightMetal');
    const pastel = Palette.color(ctx, 'pastel', 'carouselPastel');
    const sideMat = { name: 'phong' as const, opts: { color: pastel, shininess: 100, specular: 0x121212, flatShading: true } };
    const metalMat = { name: 'phong' as const, opts: { color: metal, shininess: 150, specular: 0x121212, flatShading: true } };

    return new Stack3D({
      name: 'carousel',
      children: [
        // Rug — wide flat cylinder at ground.
        new MeshCyl({
          rt: 22, rb: 22, h: 1, rs: 10,
          at: [0, 0.5, 0],
          material: sideMat,
          tag: 'rug',
        }),
        // Base — short cylinder column.
        new MeshCyl({
          rt: 10, rb: 10, h: 3, rs: 12,
          at: [0, 2.5, 0],
          material: metalMat,
          tag: 'base',
        }),
        // Main central post.
        new MeshBox({
          w: 1, h: 25, d: 1,
          at: [0, 16, 0],
          material: sideMat,
          tag: 'post',
        }),
        // Top stopper — small 5-sided cylinder cap.
        new MeshCyl({
          rt: 2, rb: 2, h: 1, rs: 5,
          at: [0, 29, 0],
          material: metalMat,
          tag: 'stopper',
        }),
        // Arms group — this rotates + bobs.
        new Stack3D({
          name: 'arms',
          at: [0, 23, 0],
          children: [
            // 3 cross-arms.
            ...ARM_ROTATIONS.map((ry, i) =>
              new MeshBox({
                w: 30, h: 1, d: 1,
                rot: [0, ry, 0],
                material: metalMat,
                tag: `arm_${i}`,
                key: `arm_${i}`,
              })
            ),
            // 6 ferry pods at the arm tips.
            ...FERRY_POSITIONS.map(([x, z], i) =>
              new Stack3D({
                at: [x, -15, z],
                children: [new Ferry({ key: `ferry_${i}` })],
                key: `ferry_pos_${i}`,
              })
            ),
          ],
        }),
        // Arms rotation oscillates (matches upstream's `Math.sin(delta*2)`-modulated
        // spin) plus a slow vertical bob.
        new BoneOscillate({ target: 'arms', axis: 'y', baseSpeed: 1.2, period: 3.14 }),
        new BoneBob({ target: 'arms', amplitude: 0.4, period: 6 }),
      ],
    });
  }
}

export default widgetToAssetModule(
  'carousel',
  {
    kind: 'prop',
    archetype: 'prop',
    name: 'Carousel',
    description: 'Animated merry-go-round: rotating arm group with 6 pastel ferry pods + bobbing motion.',
  },
  new Carousel(),
);
