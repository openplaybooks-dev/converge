// AirPlane — ported from interactive-low-poly-environment's `AirPlane`
// (Roberto Nacu, MIT). Fuselage + wing + tail + engine + spinning propeller.
//
// Original: js/main.js:3235.
//   - Fuselage: 80×50×60 BoxGeometry with the back vertices pinched to taper
//     toward the tail. Our library doesn't expose vertex-edit; we approximate
//     the taper with a small back fuselage box.
//   - Wing: 40×8×150 (Y is wing thickness; Z is span).
//   - Tail fin: 20×15×5 vertical at the back.
//   - Engine: 20×50×60 cylinder-ish box at the front.
//   - Propeller: hub (20×10×10) + one vertical blade (1×70×20). Spun at 50 rad/s
//     in the original.
// The whole assembly was scaled by upstream to (0.3, 0.21, 0.21); we author
// at that scale.

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  MeshBox,
  Palette,
  BoneSpin,
  AIRPLANE_COLORS,
  widgetToAssetModule,
} from '@lego';

const SX = 0.3, SY = 0.21, SZ = 0.21;

export class AirPlane extends StatelessWidget3D {
  /** Body color override; otherwise picks AIRPLANE_COLORS[colorIndex]. */
  readonly bodyColor?: number;
  readonly colorIndex: number;

  constructor(opts: { bodyColor?: number; colorIndex?: number; key?: string } = {}) {
    super({ key: opts.key });
    this.bodyColor = opts.bodyColor;
    this.colorIndex = opts.colorIndex ?? 0;
  }

  override build(ctx: BuildContext): Widget3D {
    const bodyColor =
      this.bodyColor ?? AIRPLANE_COLORS[this.colorIndex % AIRPLANE_COLORS.length];
    const body = Palette.color(ctx, 'body', bodyColor);
    const metal = Palette.color(ctx, 'metal', 'lightMetal');
    const dark = Palette.color(ctx, 'dark', 'darkMetal');
    const bodyMat = { name: 'phong' as const, opts: { color: body, shininess: 180, specular: 0x121212, flatShading: true } };
    const metalMat = { name: 'phong' as const, opts: { color: metal, shininess: 180, specular: 0x121212, flatShading: true } };
    const darkMat = { name: 'phong' as const, opts: { color: dark, shininess: 180, specular: 0x121212, flatShading: true } };

    return new Stack3D({
      name: 'airplane',
      children: [
        // Main fuselage front.
        // Fuselage — single box with the back face pinched inward 50%.
        // Replaces upstream's per-vertex y/z edits on the BoxGeometry.
        new MeshBox({
          w: 80 * SX, h: 50 * SY, d: 60 * SZ,
          deformTaper: { face: 'left', factor: 0.4 },
          material: bodyMat,
          tag: 'fuselage',
        }),
        // Tail fin — vertical plate at the back.
        new MeshBox({
          w: 20 * SX, h: 30 * SY, d: 5 * SZ,
          at: [-55 * SX, 15 * SY, 0],
          material: bodyMat,
          tag: 'tail_fin',
        }),
        // Wings — span across Z.
        new MeshBox({
          w: 40 * SX, h: 8 * SY, d: 150 * SZ,
          material: bodyMat,
          tag: 'wings',
        }),
        // Engine — box just in front of the fuselage.
        new MeshBox({
          w: 20 * SX, h: 50 * SY, d: 60 * SZ,
          at: [50 * SX, 0, 0],
          material: metalMat,
          tag: 'engine',
        }),
        // Propeller assembly (hub + 1 blade), tagged so Animator.spin can find it.
        new Stack3D({
          name: 'propeller',
          at: [60 * SX, 0, 0],
          children: [
            new MeshBox({
              w: 20 * SX, h: 10 * SY, d: 10 * SZ,
              material: metalMat,
              tag: 'propeller_hub',
            }),
            new MeshBox({
              w: 1 * SX, h: 70 * SY, d: 20 * SZ,
              at: [8 * SX, 0, 0],
              material: darkMat,
              tag: 'propeller_blade',
            }),
          ],
        }),
        // The propeller spin: target the named Stack3D group via its tag.
        // Stack3D.name registers in the refs map under that key; Animator.spin
        // resolves the string via the new tag-fallback path.
        new BoneSpin({ target: 'propeller', axis: 'x', speed: 8 }),
      ],
    });
  }
}

export default widgetToAssetModule(
  'airplane',
  {
    kind: 'prop',
    archetype: 'vehicle',
    name: 'AirPlane',
    description: 'Low-poly biplane: fuselage + wings + tail + spinning propeller. Pick body color via colorIndex prop.',
  },
  new AirPlane(),
);
