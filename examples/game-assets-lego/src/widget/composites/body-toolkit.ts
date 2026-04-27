// Body parts toolkit — composable humanoid anatomy with smooth surfaces.
//
// Limbs are MeshLathe revolved profiles (5-7 control points giving real
// anatomical curve: bicep bulge, elbow narrow, calf taper, etc.) rather than
// straight cylinders. Joints are filleted with small spheres to hide seams.
// Skin uses smooth-shaded phong (low shininess) instead of flat-shaded toon.
//
// Each part is a StatelessWidget3D reading inherited Palette + Seed.
// Parts attach mesh leaves to specific bones from `Rig.detailedHumanoid()`.

import {
  StatelessWidget3D, type BuildContext, type Widget3D,
} from '../types.js';
import { Stack3D } from '../stack.js';
import { Palette } from '../inherited/palette.js';
import { MeshBox, MeshCyl, MeshSphere, MeshCapsule, MeshLathe } from '../leaves/mesh-leaves.js';
import type { ColorInput } from '../../style.js';
import type { MaterialOpts } from '../../types.js';

type Build = 'thin' | 'average' | 'broad';

function buildScale(build: Build | undefined): number {
  return build === 'thin' ? 0.85 : build === 'broad' ? 1.18 : 1.0;
}

/** Smooth-shaded skin material — replaces the old flat-shaded 'toon' default. */
function skinMaterial(color: ColorInput): { name: 'phong'; opts: MaterialOpts } {
  return {
    name: 'phong',
    opts: {
      color,
      shininess: 8,
      specular: 0x0a0a0a,
      flatShading: false,
    },
  };
}

// Default lathe segments — high enough for round silhouettes at viewer scale.
const LATHE_SEGS = 16;
const SPHERE_WS = 20;
const SPHERE_HS = 14;

// ── Torso ────────────────────────────────────────────────────────────────

export interface TorsoOpts {
  build?: Build;
  height?: number;
  /** When true, render chest + abdomen as two capsules (chest on `chest`, abdomen on `spine`). */
  abdomenSplit?: boolean;
  color?: ColorInput;
  tag?: string;
  key?: string;
}

export class Torso extends StatelessWidget3D {
  private readonly o: TorsoOpts;
  constructor(opts: TorsoOpts = {}) { super({ key: opts.key }); this.o = opts; }
  override build(ctx: BuildContext): Widget3D {
    const o = this.o;
    const skin = o.color ?? Palette.color(ctx, 'skin', 'brick');
    const w = buildScale(o.build);
    const split = o.abdomenSplit !== false;
    const mat = skinMaterial(skin);

    const children: Widget3D[] = [
      // Chest — torso lathed profile (chest narrow at neck, broader at sternum).
      new MeshLathe({
        points: [
          [0.001, -0.20],            // bottom (waist seam) — closed apex via tiny radius
          [0.18 * w, -0.15],
          [0.20 * w, -0.05],
          [0.22 * w,  0.05],
          [0.21 * w,  0.12],
          [0.16 * w,  0.20],         // shoulder seam
          [0.001,    0.22],          // top (closed apex)
        ],
        segments: LATHE_SEGS,
        material: mat,
        attach: 'chest',
        tag: o.tag ?? 'torso_chest',
      }),
    ];
    if (split) {
      // Abdomen — slim lathed profile on the spine bone.
      children.push(new MeshLathe({
        points: [
          [0.001,    -0.10],
          [0.155 * w, -0.07],
          [0.160 * w,  0],
          [0.155 * w,  0.07],
          [0.001,     0.10],
        ],
        segments: LATHE_SEGS,
        material: mat,
        attach: 'spine',
        tag: 'torso_abdomen',
      }));
    }
    return new Stack3D({ name: 'torso', children });
  }
}

// ── Neck ──────────────────────────────────────────────────────────────────

export interface NeckOpts {
  thickness?: number;
  height?: number;
  color?: ColorInput;
  key?: string;
}

export class Neck extends StatelessWidget3D {
  private readonly o: NeckOpts;
  constructor(opts: NeckOpts = {}) { super({ key: opts.key }); this.o = opts; }
  override build(ctx: BuildContext): Widget3D {
    const o = this.o;
    const skin = o.color ?? Palette.color(ctx, 'skin', 'brick');
    const t = o.thickness ?? 0.075;
    const h = o.height ?? 0.13;
    // Tapered neck: slightly wider at the chest base, narrower at head.
    return new MeshLathe({
      points: [
        [t * 1.05, 0],
        [t * 1.00, h * 0.4],
        [t * 0.92, h * 0.85],
        [t * 0.85, h],
      ],
      segments: LATHE_SEGS,
      material: skinMaterial(skin),
      attach: 'neck',
      tag: 'neck',
    });
  }
}

// ── Head ──────────────────────────────────────────────────────────────────

export interface HeadOpts {
  shape?: 'round' | 'square' | 'long';
  size?: number;
  color?: ColorInput;
  /** Optional face widget composed alongside the head primitive. */
  face?: Widget3D | null;
  tag?: string;
  key?: string;
}

export class Head extends StatelessWidget3D {
  private readonly o: HeadOpts;
  constructor(opts: HeadOpts = {}) { super({ key: opts.key }); this.o = opts; }
  override build(ctx: BuildContext): Widget3D {
    const o = this.o;
    const skin = o.color ?? Palette.color(ctx, 'skin', 'brick');
    const size = o.size ?? 0.30;
    const shape = o.shape ?? 'round';   // default flipped from 'square' to 'round'
    const mat = skinMaterial(skin);

    let head: Widget3D;
    if (shape === 'round') {
      // Egg-shaped head: lathed with subtle vertical asymmetry (taller than wide).
      head = new MeshLathe({
        points: [
          [0.001,        -size * 0.55],
          [size * 0.40,  -size * 0.45],
          [size * 0.52,  -size * 0.30],
          [size * 0.55,  -size * 0.10],
          [size * 0.55,   size * 0.10],
          [size * 0.50,   size * 0.30],
          [size * 0.30,   size * 0.50],
          [0.001,         size * 0.55],
        ],
        segments: LATHE_SEGS,
        material: mat,
        attach: 'head',
        tag: o.tag ?? 'head',
      });
    } else if (shape === 'long') {
      head = new MeshCapsule({
        r: size * 0.45, l: size * 0.5,
        rot: [Math.PI / 2, 0, 0],
        material: mat,
        attach: 'head',
        tag: o.tag ?? 'head',
      });
    } else {
      head = new MeshBox({
        w: size, h: size, d: size,
        material: mat,
        attach: 'head',
        tag: o.tag ?? 'head',
      });
    }

    return new Stack3D({
      name: 'head_group',
      children: o.face ? [head, o.face] : [head],
    });
  }
}

// ── Shoulders ─────────────────────────────────────────────────────────────

export interface ShouldersOpts {
  padSize?: number;
  color?: ColorInput;
  key?: string;
}

export class Shoulders extends StatelessWidget3D {
  private readonly o: ShouldersOpts;
  constructor(opts: ShouldersOpts = {}) { super({ key: opts.key }); this.o = opts; }
  override build(ctx: BuildContext): Widget3D {
    const o = this.o;
    const skin = o.color ?? Palette.color(ctx, 'skin', 'brick');
    const r = o.padSize ?? 0.085;
    const mat = skinMaterial(skin);
    return new Stack3D({
      name: 'shoulders',
      children: [
        new MeshSphere({
          r, ws: SPHERE_WS, hs: SPHERE_HS,
          material: mat,
          attach: 'clavicle_R', tag: 'shoulder_R',
        }),
        new MeshSphere({
          r, ws: SPHERE_WS, hs: SPHERE_HS,
          material: mat,
          attach: 'clavicle_L', tag: 'shoulder_L',
        }),
      ],
    });
  }
}

// ── Arm (one side) ────────────────────────────────────────────────────────
//
// Lathed limbs: 7 control points giving anatomical taper. Points are [r, y]
// where y runs from bone origin (0) to bone tip (length). The lathe produces
// a Y-aligned mesh; we rotate Z by ±π/2 so it points along the bone's local
// X axis (which is how arm_R/L bones are oriented in the rig).

export interface ArmOpts {
  side: 'L' | 'R';
  upperLength?: number;
  upperRadius?: number;
  lowerLength?: number;
  lowerRadius?: number;
  color?: ColorInput;
  build?: Build;
  key?: string;
}

export class Arm extends StatelessWidget3D {
  private readonly o: ArmOpts;
  constructor(opts: ArmOpts) { super({ key: opts.key }); this.o = opts; }
  override build(ctx: BuildContext): Widget3D {
    const o = this.o;
    const w = buildScale(o.build);
    const skin = o.color ?? Palette.color(ctx, 'skin', 'brick');
    const upR = (o.upperRadius ?? 0.06) * w;
    const upH = o.upperLength ?? 0.30;
    const loR = (o.lowerRadius ?? 0.055) * w;
    const loH = o.lowerLength ?? 0.28;
    const sign = o.side === 'R' ? 1 : -1;
    const mat = skinMaterial(skin);

    // Upper-arm profile: shoulder narrow → bicep bulge ~0.4 → elbow taper.
    const upperProfile: Array<[number, number]> = [
      [upR * 0.85,        0],
      [upR * 1.00,  upH * 0.15],
      [upR * 1.10,  upH * 0.40],   // bicep bulge
      [upR * 1.05,  upH * 0.60],
      [upR * 0.92,  upH * 0.85],
      [upR * 0.80,  upH],          // elbow narrow
    ];
    // Forearm profile: elbow → forearm taper toward wrist.
    const lowerProfile: Array<[number, number]> = [
      [loR * 0.95,        0],
      [loR * 1.05,  loH * 0.20],   // forearm muscle bulge
      [loR * 1.00,  loH * 0.45],
      [loR * 0.85,  loH * 0.70],
      [loR * 0.72,  loH * 0.92],
      [loR * 0.70,  loH],          // wrist
    ];

    return new Stack3D({
      name: `arm_${o.side}`,
      children: [
        // Upper arm — lathed Y-axis profile, rotated to align with bone's X axis.
        new MeshLathe({
          points: upperProfile,
          segments: LATHE_SEGS,
          at: [0, 0, 0],
          rot: [0, 0, sign === 1 ? -Math.PI / 2 : Math.PI / 2],
          material: mat,
          attach: `arm_${o.side}`,
          tag: `upperArm_${o.side}`,
        }),
        // Forearm.
        new MeshLathe({
          points: lowerProfile,
          segments: LATHE_SEGS,
          at: [0, 0, 0],
          rot: [0, 0, sign === 1 ? -Math.PI / 2 : Math.PI / 2],
          material: mat,
          attach: `forearm_${o.side}`,
          tag: `forearm_${o.side}`,
        }),
        // Joint fillets.
        new MeshSphere({
          r: upR * 1.05, ws: SPHERE_WS, hs: SPHERE_HS,
          material: mat,
          attach: `arm_${o.side}`,
          tag: `shoulder_fillet_${o.side}`,
        }),
        new MeshSphere({
          r: upR * 0.85, ws: SPHERE_WS, hs: SPHERE_HS,
          at: [sign * upH, 0, 0],
          material: mat,
          attach: `arm_${o.side}`,
          tag: `elbow_fillet_${o.side}`,
        }),
        new MeshSphere({
          r: loR * 0.78, ws: SPHERE_WS, hs: SPHERE_HS,
          at: [sign * loH, 0, 0],
          material: mat,
          attach: `forearm_${o.side}`,
          tag: `wrist_fillet_${o.side}`,
        }),
      ],
    });
  }
}

// ── Hand (one side) ───────────────────────────────────────────────────────
//
// Palm becomes a small flattened ellipsoid sphere instead of a box. Fingers
// use smooth-shaded phong instead of toon.

export interface HandOpts {
  side: 'L' | 'R';
  withFingers?: boolean;
  fingerThickness?: number;
  color?: ColorInput;
  key?: string;
}

const FINGER_NAMES = ['thumb', 'index', 'middle', 'ring', 'pinky'] as const;
const FINGER_LENGTHS: Record<string, [number, number, number]> = {
  thumb:  [0.030, 0.025, 0.020],
  index:  [0.035, 0.030, 0.025],
  middle: [0.040, 0.035, 0.028],
  ring:   [0.038, 0.032, 0.025],
  pinky:  [0.032, 0.028, 0.022],
};

export class Hand extends StatelessWidget3D {
  private readonly o: HandOpts;
  constructor(opts: HandOpts) { super({ key: opts.key }); this.o = opts; }
  override build(ctx: BuildContext): Widget3D {
    const o = this.o;
    const skin = o.color ?? Palette.color(ctx, 'skin', 'brick');
    const ft = o.fingerThickness ?? 0.018;
    const sign = o.side === 'R' ? 1 : -1;
    const mat = skinMaterial(skin);

    const children: Widget3D[] = [
      // Palm — flattened ellipsoid (sphere with non-uniform scale).
      new MeshSphere({
        r: 0.045, ws: 14, hs: 10,
        scale: [1.0, 0.55, 1.3],
        at: [sign * 0.04, 0, 0],
        material: mat,
        attach: `hand_${o.side}`,
        tag: `palm_${o.side}`,
      }),
    ];

    if (o.withFingers !== false) {
      for (const finger of FINGER_NAMES) {
        const lengths = FINGER_LENGTHS[finger];
        for (let j = 0; j < 3; j++) {
          const seg = ['proximal', 'middle', 'distal'][j];
          const len = lengths[j];
          children.push(new MeshCyl({
            rt: ft * 0.85, rb: ft, h: len, rs: 8,
            at: [sign * len * 0.5, 0, 0],
            rot: [0, 0, sign === 1 ? -Math.PI / 2 : Math.PI / 2],
            material: mat,
            attach: `${finger}_${seg}_${o.side}`,
            tag: `${finger}_${seg}_${o.side}`,
            key: `${finger}_${seg}`,
          }));
        }
      }
    }

    return new Stack3D({ name: `hand_${o.side}`, children });
  }
}

// ── Leg (one side) ────────────────────────────────────────────────────────

export interface LegOpts {
  side: 'L' | 'R';
  upperLength?: number;
  lowerLength?: number;
  color?: ColorInput;
  build?: Build;
  key?: string;
}

export class Leg extends StatelessWidget3D {
  private readonly o: LegOpts;
  constructor(opts: LegOpts) { super({ key: opts.key }); this.o = opts; }
  override build(ctx: BuildContext): Widget3D {
    const o = this.o;
    const w = buildScale(o.build);
    const skin = o.color ?? Palette.color(ctx, 'skin', 'brick');
    const upH = o.upperLength ?? 0.42;
    const loH = o.lowerLength ?? 0.40;
    const upR = 0.075 * w;
    const loR = 0.060 * w;
    const mat = skinMaterial(skin);

    // Thigh profile: hip wide → mid-thigh fullness → knee narrow.
    // Lathed along Y; thigh hangs in -Y direction from the leg_<side> bone
    // origin, so points run from y=0 (hip) to y=-upH (knee).
    const thighProfile: Array<[number, number]> = [
      [upR * 0.95,  0],
      [upR * 1.10, -upH * 0.15],   // upper thigh fullness
      [upR * 1.15, -upH * 0.35],   // mid thigh peak
      [upR * 1.05, -upH * 0.55],
      [upR * 0.92, -upH * 0.80],
      [upR * 0.80, -upH],          // knee
    ];
    // Calf profile: knee narrow → calf bulge → ankle narrow.
    const shinProfile: Array<[number, number]> = [
      [loR * 0.95,  0],
      [loR * 1.10, -loH * 0.15],
      [loR * 1.18, -loH * 0.35],   // calf bulge
      [loR * 1.05, -loH * 0.60],
      [loR * 0.85, -loH * 0.85],
      [loR * 0.75, -loH],          // ankle
    ];

    return new Stack3D({
      name: `leg_${o.side}`,
      children: [
        new MeshLathe({
          points: thighProfile,
          segments: LATHE_SEGS,
          material: mat,
          attach: `leg_${o.side}`,
          tag: `upperLeg_${o.side}`,
        }),
        new MeshLathe({
          points: shinProfile,
          segments: LATHE_SEGS,
          material: mat,
          attach: `lowerLeg_${o.side}`,
          tag: `lowerLeg_${o.side}`,
        }),
        // Joint fillets.
        new MeshSphere({
          r: upR * 1.10, ws: SPHERE_WS, hs: SPHERE_HS,
          material: mat,
          attach: `leg_${o.side}`,
          tag: `hip_fillet_${o.side}`,
        }),
        new MeshSphere({
          r: upR * 0.82, ws: SPHERE_WS, hs: SPHERE_HS,
          at: [0, -upH, 0],
          material: mat,
          attach: `leg_${o.side}`,
          tag: `knee_fillet_${o.side}`,
        }),
        new MeshSphere({
          r: loR * 0.80, ws: SPHERE_WS, hs: SPHERE_HS,
          at: [0, -loH, 0],
          material: mat,
          attach: `lowerLeg_${o.side}`,
          tag: `ankle_fillet_${o.side}`,
        }),
      ],
    });
  }
}

// ── Foot (one side) ───────────────────────────────────────────────────────

export interface FootOpts {
  side: 'L' | 'R';
  withToes?: boolean;
  color?: ColorInput;
  key?: string;
}

export class Foot extends StatelessWidget3D {
  private readonly o: FootOpts;
  constructor(opts: FootOpts) { super({ key: opts.key }); this.o = opts; }
  override build(ctx: BuildContext): Widget3D {
    const o = this.o;
    const skin = o.color ?? Palette.color(ctx, 'skin', 'brick');
    const mat = skinMaterial(skin);
    const children: Widget3D[] = [
      // Foot — flattened sphere (more organic than a box).
      new MeshSphere({
        r: 0.07, ws: 14, hs: 10,
        scale: [0.85, 0.45, 1.6],
        at: [0, -0.025, 0.05],
        material: mat,
        attach: `foot_${o.side}`,
        tag: `foot_${o.side}`,
      }),
    ];
    if (o.withToes) {
      const toeNames = ['big_toe', 'index_toe', 'middle_toe', 'ring_toe', 'pinky_toe'];
      for (const t of toeNames) {
        children.push(new MeshSphere({
          r: 0.018, ws: 8, hs: 6,
          material: mat,
          attach: `${t}_${o.side}`,
          tag: `${t}_${o.side}`,
          key: t,
        }));
      }
    }
    return new Stack3D({ name: `foot_${o.side}`, children });
  }
}

// ── DefaultBody — convenient bundle ───────────────────────────────────────

export interface DefaultBodyOpts {
  build?: Build;
  withFingers?: boolean;
  withToes?: boolean;
  skinColor?: ColorInput;
  abdomenSplit?: boolean;
  key?: string;
}

export class DefaultBody extends StatelessWidget3D {
  private readonly o: DefaultBodyOpts;
  constructor(opts: DefaultBodyOpts = {}) { super({ key: opts.key }); this.o = opts; }
  override build(_ctx: BuildContext): Widget3D {
    const o = this.o;
    const build = o.build ?? 'average';
    const withFingers = o.withFingers !== false;
    const withToes = o.withToes ?? false;
    const color = o.skinColor;
    return new Stack3D({
      name: 'default_body',
      children: [
        new Torso({ build, color, abdomenSplit: o.abdomenSplit }),
        new Neck({ color }),
        new Shoulders({ color }),
        new Arm({ side: 'R', build, color }),
        new Arm({ side: 'L', build, color }),
        new Hand({ side: 'R', withFingers, color }),
        new Hand({ side: 'L', withFingers, color }),
        new Leg({ side: 'R', build, color }),
        new Leg({ side: 'L', build, color }),
        new Foot({ side: 'R', withToes, color }),
        new Foot({ side: 'L', withToes, color }),
      ],
    });
  }
}
