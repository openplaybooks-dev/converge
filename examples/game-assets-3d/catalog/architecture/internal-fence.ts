// InternalFence — ported from interactive-low-poly-environment's `InternalFence`
// (Roberto Nacu, MIT). Square fence ring around the home zone with a door
// gap on the front (south) side flanked by two lamp posts.
//
// Original: js/main.js:3987. We parameterize the boundary so scenes can
// scale the homestead. Default 50×50 ground area gives 5 segments per side
// (segment width = 10).

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  widgetToAssetModule,
} from '@lego';
import { FenceSegment } from './fence.js';
import { LampPost } from './lamppost.js';

const SEG_WIDTH = 10;

export class InternalFence extends StatelessWidget3D {
  /** Half-extent of the home zone — fence runs at ±boundary on each axis. */
  readonly boundary: number;
  /** Door gap width along the front edge, in segments (1 = 10 units). */
  readonly doorGapSegments: number;

  constructor(opts: { boundary?: number; doorGapSegments?: number; key?: string } = {}) {
    super({ key: opts.key });
    this.boundary = opts.boundary ?? 25;
    this.doorGapSegments = opts.doorGapSegments ?? 1;
  }

  override build(_ctx: BuildContext): Widget3D {
    const segs = Math.max(1, Math.round((this.boundary * 2) / SEG_WIDTH));
    const half = ((segs - 1) * SEG_WIDTH) / 2;
    const doorGapHalfWidth = (this.doorGapSegments * SEG_WIDTH) / 2;

    const children: Widget3D[] = [];

    // North side (back, +z) — full row.
    for (let i = 0; i < segs; i++) {
      children.push(new Stack3D({
        at: [i * SEG_WIDTH - half, 0, this.boundary],
        children: [new FenceSegment({ seed: 100 + i, key: `n_${i}` })],
      }));
    }

    // South side (front, -z) — door gap centered.
    for (let i = 0; i < segs; i++) {
      const x = i * SEG_WIDTH - half;
      if (Math.abs(x) < doorGapHalfWidth) continue; // skip the door gap
      children.push(new Stack3D({
        at: [x, 0, -this.boundary],
        rot: [0, Math.PI, 0],
        children: [new FenceSegment({ seed: 200 + i, key: `s_${i}` })],
      }));
    }

    // West side (-x) — rotated 90°.
    for (let i = 0; i < segs; i++) {
      children.push(new Stack3D({
        at: [-this.boundary, 0, i * SEG_WIDTH - half],
        rot: [0, Math.PI / 2, 0],
        children: [new FenceSegment({ seed: 300 + i, key: `w_${i}` })],
      }));
    }

    // East side (+x) — rotated 90°.
    for (let i = 0; i < segs; i++) {
      children.push(new Stack3D({
        at: [this.boundary, 0, i * SEG_WIDTH - half],
        rot: [0, Math.PI / 2, 0],
        children: [new FenceSegment({ seed: 400 + i, key: `e_${i}` })],
      }));
    }

    // Two lamp posts flanking the door.
    children.push(new Stack3D({
      at: [-doorGapHalfWidth - 2, 0, -this.boundary],
      children: [new LampPost({ key: 'lamp_L' })],
    }));
    children.push(new Stack3D({
      at: [doorGapHalfWidth + 2, 0, -this.boundary],
      children: [new LampPost({ key: 'lamp_R' })],
    }));

    return new Stack3D({ name: 'internal-fence', children });
  }
}

export default widgetToAssetModule(
  'internal-fence',
  {
    kind: 'building',
    archetype: 'building',
    name: 'Internal Fence',
    description: 'Square fence ring with a south-facing door gap, flanked by two lamp posts.',
  },
  new InternalFence(),
);
