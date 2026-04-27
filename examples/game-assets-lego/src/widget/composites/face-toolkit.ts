// Face toolkit — eyes, mouth, nose, ears, brows + DefaultFace bundle.
//
// Eyes attach to eye_L/eye_R bones (so EyeTracker can rotate them).
// Other features attach to the head bone with at-offsets in head-local space.

import {
  StatelessWidget3D, type BuildContext, type Widget3D,
} from '../types.js';
import { Stack3D } from '../stack.js';
import { Palette } from '../inherited/palette.js';
import { MeshBox, MeshSphere, MeshCone } from '../leaves/mesh-leaves.js';
import type { ColorInput } from '../../style.js';

// ── Eyes ──────────────────────────────────────────────────────────────────

export interface EyesOpts {
  color?: ColorInput;
  whiteColor?: ColorInput;
  size?: number;
  key?: string;
}

export class Eyes extends StatelessWidget3D {
  private readonly o: EyesOpts;
  constructor(opts: EyesOpts = {}) { super({ key: opts.key }); this.o = opts; }
  override build(ctx: BuildContext): Widget3D {
    const o = this.o;
    const iris = o.color ?? Palette.color(ctx, 'eye', 0x4a3a28);
    const white = o.whiteColor ?? Palette.color(ctx, 'eyeWhite', 0xfdfcf7);
    const size = o.size ?? 0.04;

    return new Stack3D({
      name: 'eyes',
      children: [
        new MeshSphere({
          r: size, ws: 8, hs: 6,
          material: { name: 'phong', opts: { color: white, shininess: 30 } },
          attach: 'eye_R', tag: 'sclera_R',
        }),
        new MeshSphere({
          r: size * 0.55, ws: 6, hs: 4,
          at: [0, 0, size * 0.6],
          material: { name: 'toon', opts: { color: iris } },
          attach: 'eye_R', tag: 'iris_R',
        }),
        new MeshSphere({
          r: size, ws: 8, hs: 6,
          material: { name: 'phong', opts: { color: white, shininess: 30 } },
          attach: 'eye_L', tag: 'sclera_L',
        }),
        new MeshSphere({
          r: size * 0.55, ws: 6, hs: 4,
          at: [0, 0, size * 0.6],
          material: { name: 'toon', opts: { color: iris } },
          attach: 'eye_L', tag: 'iris_L',
        }),
      ],
    });
  }
}

// ── Mouth ─────────────────────────────────────────────────────────────────

export interface MouthOpts {
  expression?: 'neutral' | 'smile' | 'frown' | 'open';
  width?: number;
  color?: ColorInput;
  key?: string;
}

export class Mouth extends StatelessWidget3D {
  private readonly o: MouthOpts;
  constructor(opts: MouthOpts = {}) { super({ key: opts.key }); this.o = opts; }
  override build(ctx: BuildContext): Widget3D {
    const o = this.o;
    const color = o.color ?? Palette.color(ctx, 'mouth', 0x6b1d2a);
    const w = o.width ?? 0.10;
    const expr = o.expression ?? 'neutral';
    const tiltZ = expr === 'smile' ? 0.15 : expr === 'frown' ? -0.15 : 0;
    const h = expr === 'open' ? 0.025 : 0.015;
    return new MeshBox({
      w, h, d: 0.012,
      at: [0, -0.06, 0.155],
      rot: [0, 0, tiltZ],
      material: { name: 'toon', opts: { color } },
      attach: 'head', tag: 'mouth',
    });
  }
}

// ── Nose ──────────────────────────────────────────────────────────────────

export interface NoseOpts {
  shape?: 'small' | 'big' | 'pointed';
  color?: ColorInput;
  key?: string;
}

export class Nose extends StatelessWidget3D {
  private readonly o: NoseOpts;
  constructor(opts: NoseOpts = {}) { super({ key: opts.key }); this.o = opts; }
  override build(ctx: BuildContext): Widget3D {
    const o = this.o;
    const color = o.color ?? Palette.color(ctx, 'skin', 'brick');
    const shape = o.shape ?? 'small';
    if (shape === 'pointed') {
      return new MeshCone({
        r: 0.025, h: 0.08, rs: 4,
        at: [0, 0, 0.165],
        rot: [Math.PI / 2, 0, 0],
        material: { name: 'toon', opts: { color } },
        attach: 'head', tag: 'nose',
      });
    }
    const r = shape === 'big' ? 0.040 : 0.028;
    return new MeshSphere({
      r, ws: 6, hs: 4,
      at: [0, 0, 0.16],
      material: { name: 'toon', opts: { color } },
      attach: 'head', tag: 'nose',
    });
  }
}

// ── Ears ──────────────────────────────────────────────────────────────────

export interface EarsOpts {
  shape?: 'round' | 'pointed' | 'small';
  color?: ColorInput;
  key?: string;
}

export class Ears extends StatelessWidget3D {
  private readonly o: EarsOpts;
  constructor(opts: EarsOpts = {}) { super({ key: opts.key }); this.o = opts; }
  override build(ctx: BuildContext): Widget3D {
    const o = this.o;
    const color = o.color ?? Palette.color(ctx, 'skin', 'brick');
    const shape = o.shape ?? 'round';
    const make = (side: 'L' | 'R'): Widget3D => {
      const sign = side === 'R' ? 1 : -1;
      if (shape === 'pointed') {
        return new MeshCone({
          r: 0.025, h: 0.08, rs: 4,
          at: [sign * 0.16, 0.04, 0],
          rot: [0, 0, sign * Math.PI / 2],
          material: { name: 'toon', opts: { color } },
          attach: 'head', tag: `ear_${side}`,
        });
      }
      const size = shape === 'small' ? 0.025 : 0.035;
      return new MeshSphere({
        r: size, ws: 6, hs: 4,
        at: [sign * 0.16, 0.02, 0],
        scale: [0.5, 1, 0.7],
        material: { name: 'toon', opts: { color } },
        attach: 'head', tag: `ear_${side}`,
      });
    };
    return new Stack3D({ name: 'ears', children: [make('R'), make('L')] });
  }
}

// ── Brows ─────────────────────────────────────────────────────────────────

export interface BrowsOpts {
  color?: ColorInput;
  expression?: 'neutral' | 'angry' | 'sad';
  key?: string;
}

export class Brows extends StatelessWidget3D {
  private readonly o: BrowsOpts;
  constructor(opts: BrowsOpts = {}) { super({ key: opts.key }); this.o = opts; }
  override build(ctx: BuildContext): Widget3D {
    const o = this.o;
    const color = o.color ?? Palette.color(ctx, 'hair', 0x2a1a10);
    const expr = o.expression ?? 'neutral';
    const tiltZ = expr === 'angry' ? -0.4 : expr === 'sad' ? 0.4 : 0;
    return new Stack3D({
      name: 'brows',
      children: [
        new MeshBox({
          w: 0.05, h: 0.012, d: 0.012,
          at: [0.06, 0.08, 0.155],
          rot: [0, 0, -tiltZ],
          material: { name: 'toon', opts: { color } },
          attach: 'head', tag: 'brow_R',
        }),
        new MeshBox({
          w: 0.05, h: 0.012, d: 0.012,
          at: [-0.06, 0.08, 0.155],
          rot: [0, 0, tiltZ],
          material: { name: 'toon', opts: { color } },
          attach: 'head', tag: 'brow_L',
        }),
      ],
    });
  }
}

// ── DefaultFace bundle ────────────────────────────────────────────────────

export interface DefaultFaceOpts {
  eyeColor?: ColorInput;
  expression?: 'neutral' | 'smile' | 'frown';
  withEars?: boolean;
  key?: string;
}

export class DefaultFace extends StatelessWidget3D {
  private readonly o: DefaultFaceOpts;
  constructor(opts: DefaultFaceOpts = {}) { super({ key: opts.key }); this.o = opts; }
  override build(_ctx: BuildContext): Widget3D {
    const o = this.o;
    const children: Widget3D[] = [
      new Eyes({ color: o.eyeColor }),
      new Brows({}),
      new Nose({}),
      new Mouth({ expression: o.expression }),
    ];
    if (o.withEars !== false) children.push(new Ears({}));
    return new Stack3D({ name: 'face', children });
  }
}
