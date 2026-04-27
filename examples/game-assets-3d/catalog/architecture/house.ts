// House — ported from interactive-low-poly-environment's `House`
// (Roberto Nacu, MIT). First floor + stone basement + pyramidal metal roof
// support + red-brick roof cover + door + circular window + chimney.
//
// Original: js/main.js:4566. Upstream uses ExtrudeGeometry for the door's
// rounded top and the window's annular ring; our library doesn't expose
// extrude geometries, so we approximate:
//   - door:    plain box (cuboid stand-in for the rounded-top silhouette)
//   - window:  thin Ring (annular frame) + vertical/horizontal cross bars + glass disc
//   - chimney: two upright boxes connected via a horizontal arm (curve becomes 3 boxes)
// The silhouette reads correctly at scene scale; the fine extrude detail is
// out of scope. Authoring is at upstream's post-scale 0.21 to keep numbers
// in viewer units (~30u footprint instead of upstream's 140u).

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  MeshBox, MeshCyl, MeshPlane, MeshExtrude,
  Palette,
  widgetToAssetModule,
} from '@lego';

const SC = 0.21;
const W = 140 * SC;       // ~29.4
const H = 50 * SC;        // ~10.5
const D = 140 * SC;       // ~29.4

export class House extends StatelessWidget3D {
  override build(ctx: BuildContext): Widget3D {
    const wall = Palette.color(ctx, 'wall', 'brownBrick');
    const stone = Palette.color(ctx, 'stone', 'rockGrey');
    const roofMetal = Palette.color(ctx, 'roofSupport', 'darkMetal');
    const roofCover = Palette.color(ctx, 'roof', 'redBrick');
    const wood = Palette.color(ctx, 'wood', 'pineWood');
    const glass = Palette.color(ctx, 'glass', 'glass');
    const chimneyColor = Palette.color(ctx, 'chimney', 'chimneyGrey');

    return new Stack3D({
      name: 'house',
      children: [
        // Stone basement — slightly wider than walls.
        new MeshBox({
          w: W + 10 * SC, h: H / 10, d: D + 10 * SC,
          at: [0, H / 20, 0],
          material: { name: 'ground', opts: { color: stone } },
          tag: 'basement',
        }),
        // First floor — main wall block.
        new MeshBox({
          w: W, h: H, d: D,
          at: [0, H / 2, 0],
          material: { name: 'phong', opts: { color: wall, shininess: 0, specular: 0x000000 } },
          tag: 'walls',
        }),
        // Roof support — 4-sided cylinder = pyramidal metal drainage.
        new MeshCyl({
          rt: (W - 40 * SC) / 2 + 4, rb: (W - 35 * SC) / 2 + 4, h: 5 * SC, rs: 4,
          at: [0, H - 0.5 * SC, 0],
          rot: [0, Math.PI / 4, 0],
          material: { name: 'phong', opts: { color: roofMetal, shininess: 100, specular: 0x121212, flatShading: true } },
          tag: 'roof_support',
        }),
        // Roof cover — main red roof shape.
        new MeshCyl({
          rt: 50 * SC, rb: 100 * SC, h: 40 * SC, rs: 4,
          at: [0, H + 20 * SC - 0.5 * SC, 0],
          rot: [0, Math.PI / 4, 0],
          material: { name: 'phong', opts: { color: roofCover, shininess: 0, specular: 0x000000, flatShading: true } },
          tag: 'roof',
        }),
        // Door — extruded silhouette with arched top, on +X face.
        new MeshExtrude({
          shape: MeshExtrude.dome(30 * SC, 30 * SC, 10 * SC, 8),
          depth: 2 * SC,
          at: [W / 2, 15 * SC, -25 * SC],
          rot: [0, Math.PI / 2, 0],
          material: { name: 'phong', opts: { color: wood, shininess: 60, specular: 0x0f0f0f } },
          tag: 'door',
        }),
        // Window on +X face: extruded annular ring + cross bars + glass disc.
        new Stack3D({
          name: 'window',
          at: [W / 2 + 1 * SC, 25 * SC, 35 * SC],
          rot: [0, Math.PI / 2, 0],
          children: [
            new MeshExtrude({
              shape: MeshExtrude.circleWithHole(14 * SC, 11 * SC, 32),
              depth: 2 * SC,
              material: { name: 'phong', opts: { color: wood, shininess: 60, specular: 0x0f0f0f } },
              tag: 'window_frame',
            }),
            new MeshBox({
              w: 27 * SC, h: 1 * SC, d: 1 * SC,
              material: { name: 'phong', opts: { color: wood, shininess: 60, specular: 0x0f0f0f } },
              tag: 'window_bar_h',
            }),
            new MeshBox({
              w: 1 * SC, h: 27 * SC, d: 1 * SC,
              material: { name: 'phong', opts: { color: wood, shininess: 60, specular: 0x0f0f0f } },
              tag: 'window_bar_v',
            }),
            new MeshPlane({
              w: 22 * SC, h: 22 * SC,
              at: [0, 0, -0.2 * SC],
              material: { name: 'glass', opts: { color: glass } },
              tag: 'window_glass',
            }),
          ],
        }),
        // Chimney — Catmull-Rom-swept pipe matching upstream's spline:
        // (0,0,0) → (0,0,10) → (0,30,20). Outline is a 15×15 square cross-section.
        new MeshExtrude({
          shape: MeshExtrude.rect(6 * SC, 6 * SC),
          extrudePath: [
            [0, 0, 0],
            [0, 0, 10 * SC],
            [0, 30 * SC, 20 * SC],
          ],
          steps: 12,
          curveSegments: 8,
          at: [0, H + 0, 30 * SC - 10 * SC],
          material: { name: 'phong', opts: { color: chimneyColor, shininess: 0, specular: 0x000000, flatShading: true } },
          tag: 'chimney',
        }),
      ],
    });
  }
}

export default widgetToAssetModule(
  'house',
  {
    kind: 'building',
    archetype: 'building',
    name: 'House',
    description: 'Two-story brick cottage with stone basement, pyramidal red roof, round window, and chimney.',
  },
  new House(),
);
