// WaveSurface — per-frame vertex displacement on a tagged plane geometry,
// reproducing upstream's `wave_effect` formula on the lake water surface.
//
// Authors mark a plane mesh with `tag: 'lake_surface'` and add
// `new WaveSurface({ target: 'lake_surface' })` as a sibling.

import * as THREE from 'three';
import { LeafWidget3D, type BuildContext } from '../types.js';
import type { Behavior } from '../../entity/types.js';
import type { Tick } from '../../types.js';

export interface WaveSurfaceOpts {
  target: string;
  cycle?: number;
  height?: number;
  speed?: number;
  key?: string;
}

export class WaveSurface extends LeafWidget3D {
  private readonly o: WaveSurfaceOpts;
  constructor(opts: WaveSurfaceOpts) {
    super({ key: opts.key });
    this.o = opts;
  }
  override buildBehaviors(_ctx: BuildContext): Behavior[] {
    const o = this.o;
    return [{
      kind: 'wave-surface',
      config: o,
      onBuild(ctx) {
        const cycle = o.cycle ?? 4;
        const height = o.height ?? 0.6;
        const speed = o.speed ?? 1;

        // Defer initialization to the first tick — the mesh needs to have been
        // created and registered in ctx.refs by an earlier sibling.
        let initialized = false;
        let basePositions: Float32Array | null = null;
        let positionAttr: THREE.BufferAttribute | null = null;
        let geom: THREE.BufferGeometry | null = null;

        const init = (): boolean => {
          const mesh = ctx.refs.get(o.target) as THREE.Mesh | undefined;
          if (!mesh) return false;
          geom = mesh.geometry;
          positionAttr = geom.attributes.position as THREE.BufferAttribute;
          basePositions = new Float32Array(positionAttr.array);
          initialized = true;
          return true;
        };

        const tick: Tick = (t) => {
          if (!initialized && !init()) return;
          if (!positionAttr || !basePositions || !geom) return;

          const arr = positionAttr.array as Float32Array;
          const phase = t * speed;
          // Upstream `wave_effect` mutates Z (in the plane's local pre-rotation
          // frame). After we rotated the plane -π/2 around X, the original Z
          // axis points along world -Y, so to get vertical waves we displace
          // along the plane's local Z (axis 2 in the position buffer).
          for (let i = 0; i < positionAttr.count; i++) {
            const x = basePositions[i * 3 + 0];
            const y = basePositions[i * 3 + 1];
            const wave = Math.sin(x / cycle + phase) * Math.cos(y / cycle + phase) * height;
            arr[i * 3 + 2] = basePositions[i * 3 + 2] + wave;
          }
          positionAttr.needsUpdate = true;
          geom.computeVertexNormals();
        };
        return { ticks: [tick] };
      },
    }];
  }
}
