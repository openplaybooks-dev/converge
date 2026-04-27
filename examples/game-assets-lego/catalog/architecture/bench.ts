// Bench — ported from interactive-low-poly-environment's `Bench`
// (Roberto Nacu, MIT). Two side panels + 5 horizontal seat slats.
//
// Original: js/main.js:4831. Upstream scales the whole mesh by 0.3/0.35/0.3
// after construction; we author at the smaller scale directly so primitives
// are intuitive in viewer units.

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  MeshBox,
  Palette,
  widgetToAssetModule,
} from '@lego';

const SX = 0.3, SY = 0.35, SZ = 0.3; // upstream's post-construction scale

export class Bench extends StatelessWidget3D {
  override build(ctx: BuildContext): Widget3D {
    const sideColor = Palette.color(ctx, 'metal', 'darkMetal');
    const seatColor = Palette.color(ctx, 'wood', 'fenceWood');
    const sideMat = { name: 'toon' as const, opts: { color: sideColor } };
    const seatMat = { name: 'bark' as const, opts: { color: seatColor } };

    // One bench side: tall back panel + 2 legs.
    const sideGroup = (xCenter: number, keyPrefix: string) =>
      new Stack3D({
        at: [xCenter * SX, 0, 0],
        children: [
          new MeshBox({
            w: 1 * SX, h: 3 * SY, d: 10 * SZ,
            material: sideMat,
            tag: `${keyPrefix}_panel`,
            key: `${keyPrefix}_panel`,
          }),
          new MeshBox({
            w: 1 * SX, h: 6 * SY, d: 3 * SZ,
            at: [0, (-1.5 - 3) * SY, (-5 + 1.5) * SZ],
            material: sideMat,
            tag: `${keyPrefix}_legL`,
            key: `${keyPrefix}_legL`,
          }),
          new MeshBox({
            w: 1 * SX, h: 6 * SY, d: 3 * SZ,
            at: [0, (-1.5 - 3) * SY, (5 - 1.5) * SZ],
            material: sideMat,
            tag: `${keyPrefix}_legR`,
            key: `${keyPrefix}_legR`,
          }),
        ],
      });

    return new Stack3D({
      name: 'bench',
      at: [0, (3 + 12) * SY * 0.5, 0], // center the bench above ground
      children: [
        sideGroup(-10, 'sideL'),
        sideGroup(10, 'sideR'),
        new Stack3D({
          name: 'seat',
          children: Array.from({ length: 5 }, (_, idx) => {
            const i = idx - 2; // -2..2
            return new MeshBox({
              w: 19 * SX, h: 0.5 * SY, d: 1.5 * SZ,
              at: [0, 0, i * 1.9 * SZ],
              material: seatMat,
              tag: `slat_${idx}`,
              key: `slat_${idx}`,
            });
          }),
        }),
      ],
    });
  }
}

export default widgetToAssetModule(
  'bench',
  {
    kind: 'building',
    archetype: 'building',
    name: 'Bench',
    description: 'Park bench: two metal sides with legs plus five wooden seat slats.',
  },
  new Bench(),
);
