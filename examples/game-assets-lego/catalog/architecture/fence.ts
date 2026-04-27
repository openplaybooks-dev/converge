// Fence — ported from interactive-low-poly-environment's `Fence`
// (Roberto Nacu, MIT). 10-unit-wide segment: 2 horizontal back rails
// + 4 vertical front logs, each deformLog'd for hand-cut log feel.
//
// Original: js/main.js:3758. Authors compose a longer fence by placing
// multiple FenceSegment instances in a Stack3D / row.

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  MeshBox,
  Palette,
  widgetToAssetModule,
} from '@lego';

const WIDTH = 10;
const HEIGHT = 4;
const POST_W = 1;
const POST_D = 0.5;
// Post X positions match upstream: -3, -1, +1, +3 (relative to segment center).
const POST_X = [-3, -1, 1, 3];

export class FenceSegment extends StatelessWidget3D {
  readonly seed: number;
  constructor(opts: { seed?: number; key?: string } = {}) {
    super({ key: opts.key });
    this.seed = opts.seed ?? 101;
  }

  override build(ctx: BuildContext): Widget3D {
    const wood = Palette.color(ctx, 'wood', 'fenceWood');
    const mat = { name: 'bark' as const, opts: { color: wood } };

    return new Stack3D({
      name: 'fence-segment',
      children: [
        // Back rails (2 horizontal logs running along the width).
        new MeshBox({
          w: WIDTH, h: 0.5, d: 0.2,
          at: [0, HEIGHT / 2 - 0.8, 0],
          material: mat,
          tag: 'rail_bottom',
        }),
        new MeshBox({
          w: WIDTH, h: 0.5, d: 0.2,
          at: [0, HEIGHT / 2 + 0.8, 0],
          material: mat,
          tag: 'rail_top',
        }),
        // 4 front posts.
        new Stack3D({
          name: 'posts',
          children: POST_X.map((x, i) =>
            new MeshBox({
              w: POST_W, h: HEIGHT, d: POST_D,
              deformLog: { amount: 0.18, seed: this.seed + i },
              at: [x, HEIGHT / 2, 0],
              material: mat,
              tag: `post_${i}`,
              key: `post_${i}`,
            })
          ),
        }),
      ],
    });
  }
}

/** A multi-segment fence run. Useful for scene composition. */
export class Fence extends StatelessWidget3D {
  readonly segments: number;
  readonly seed: number;
  constructor(opts: { segments?: number; seed?: number; key?: string } = {}) {
    super({ key: opts.key });
    this.segments = opts.segments ?? 1;
    this.seed = opts.seed ?? 101;
  }

  override build(_ctx: BuildContext): Widget3D {
    const half = ((this.segments - 1) * WIDTH) / 2;
    return new Stack3D({
      name: 'fence',
      children: Array.from({ length: this.segments }, (_, i) =>
        new Stack3D({
          at: [i * WIDTH - half, 0, 0],
          children: [new FenceSegment({ seed: this.seed + i * 11, key: `seg_${i}` })],
        })
      ),
    });
  }
}

export default widgetToAssetModule(
  'fence',
  {
    kind: 'building',
    archetype: 'building',
    name: 'Fence',
    description: 'Wood fence segment: two horizontal back rails plus four deformed-log front posts.',
  },
  new FenceSegment(),
);
