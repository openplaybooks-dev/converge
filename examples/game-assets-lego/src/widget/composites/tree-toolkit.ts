// Tree toolkit — shared composites used by every tree species widget.
//
// Each species widget (catalog/nature/tree-*.ts) composes from this toolkit
// rather than authoring meshes directly. The toolkit absorbs the variation
// that's common across species (trunk taper, recursive branches, foliage
// clustering, root flares) so species widgets can be small recipes.
//
// Performance note: 30-tree forests are fine. Each tree is a unique geometry
// (per-instance vertex deformation), so 200+ trees per scene becomes the
// limit. For larger forests, the upgrade path is geometry pooling/instancing,
// but that's out of scope here.

import * as THREE from 'three';
import {
  StatelessWidget3D, type BuildContext, type Widget3D,
} from '../types.js';
import { Stack3D } from '../stack.js';
import { Palette } from '../inherited/palette.js';
import { Seed } from '../inherited/seed.js';
import { MeshCyl, MeshIcosa, MeshCone } from '../leaves/mesh-leaves.js';
import type { ColorInput } from '../../style.js';

// ── Local PRNG (mulberry32) — duplicated from src/deform.ts to avoid
// importing the whole deform module into the widget layer. 5 lines. ──

function rngFor(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function jitter(rng: () => number, amount: number): number {
  return (rng() - 0.5) * 2 * amount;
}

// ── 1. Trunk ────────────────────────────────────────────────────────────────

export interface TrunkOpts {
  height: number;
  radiusTop: number;
  radiusBottom: number;
  /** Color override; otherwise reads Palette.color(ctx, 'bark') with fallback 'pineWood'. */
  barkColor?: ColorInput;
  /** Trunk shape preset. 'columnar' = straight, 'flared' = wider base, 'linear' = slight taper. */
  taper?: 'linear' | 'flared' | 'columnar';
  /** Wobble magnitude for deformOrganic. Default 0.18 (Pine-style). */
  deformAmount?: number;
  /** Bark material noise frequency. Default 6. */
  noiseScale?: number;
  /** Radial segments. Default 8. */
  rs?: number;
  /** Restrict deform to a yBand fraction (0..1) of the trunk. Default unrestricted. */
  yBand?: [number, number];
  seed?: number;
  /** Position of trunk base. Default [0,0,0]; trunk extends upward in +Y. */
  at?: [number, number, number];
  tag?: string;
  key?: string;
}

export class Trunk extends StatelessWidget3D {
  private readonly o: TrunkOpts;
  constructor(opts: TrunkOpts) {
    super({ key: opts.key });
    this.o = opts;
  }
  override build(ctx: BuildContext): Widget3D {
    const o = this.o;
    const seed = o.seed ?? Seed.value(ctx, 7);
    const bark = o.barkColor ?? Palette.color(ctx, 'bark', 'pineWood');
    const at = o.at ?? [0, 0, 0];

    let rt = o.radiusTop;
    let rb = o.radiusBottom;
    if (o.taper === 'flared') rb = Math.max(rb, rt * 1.6);
    else if (o.taper === 'columnar') rt = rb * 0.9;

    return new MeshCyl({
      rt, rb, h: o.height, rs: o.rs ?? 8,
      deformOrganic: { amount: o.deformAmount ?? 0.18, seed, yBand: o.yBand },
      at: [at[0], at[1] + o.height / 2, at[2]],
      material: { name: 'bark', opts: { color: bark, noiseScale: o.noiseScale ?? 6 } },
      tag: o.tag ?? 'trunk',
    });
  }
}

// ── 2. Branch (recursive) ───────────────────────────────────────────────────

/** Called at terminal tips (depth=0) to place foliage. Return null for bare. */
export type FoliageBuilder = (args: {
  ctx: BuildContext;
  seed: number;
  at: [number, number, number];
  tipRadius: number;
}) => Widget3D | null;

export interface BranchOpts {
  length: number;
  radius: number;
  /** Euler [x,y,z] rotation of this branch's local growth axis. Default [0,0,0] = +Y. */
  direction?: [number, number, number];
  /** Recursion remaining: 0 = terminal (places foliage if provided). */
  depth: number;
  /** Children per non-terminal node. Default 2. */
  splits?: number;
  /** Angle off parent axis for each child, radians. Default 0.55. */
  splitAngle?: number;
  lengthFalloff?: number;     // default 0.65
  radiusFalloff?: number;     // default 0.7
  barkColor?: ColorInput;
  noiseScale?: number;
  deformAmount?: number;      // default 0.10
  rs?: number;                // default 6
  seed?: number;
  /** Foliage builder called at terminal tips (depth=0). */
  foliage?: FoliageBuilder;
  /** Position of branch base in parent's local frame. */
  at?: [number, number, number];
  tag?: string;
  key?: string;
}

export class Branch extends StatelessWidget3D {
  private readonly o: BranchOpts;
  constructor(opts: BranchOpts) {
    super({ key: opts.key });
    this.o = opts;
  }

  override build(ctx: BuildContext): Widget3D {
    const o = this.o;
    const seed = o.seed ?? Seed.value(ctx, 1);
    const rng = rngFor(seed);
    const bark = o.barkColor ?? Palette.color(ctx, 'bark', 'blobWood');
    const dir = o.direction ?? [0, 0, 0];
    const radF = o.radiusFalloff ?? 0.7;
    const lenF = o.lengthFalloff ?? 0.65;

    // The segment cylinder, base at [0,0,0] in this branch's local frame.
    const segment = new MeshCyl({
      rt: o.radius * radF,
      rb: o.radius,
      h: o.length,
      rs: o.rs ?? 6,
      deformOrganic: { amount: o.deformAmount ?? 0.10, seed },
      at: [0, o.length / 2, 0],
      material: { name: 'bark', opts: { color: bark, noiseScale: o.noiseScale ?? 5 } },
      tag: o.tag,
    });

    const tip: [number, number, number] = [0, o.length, 0];
    const children: Widget3D[] = [segment];

    if (o.depth <= 0) {
      // Terminal: maybe place foliage at the tip.
      const f = o.foliage?.({ ctx, seed: seed + 1000, at: tip, tipRadius: o.radius * radF });
      if (f) children.push(f);
    } else {
      const splits = o.splits ?? 2;
      const splitAngle = o.splitAngle ?? 0.55;
      const childOffsets = [1, 10, 100, 1000];
      for (let i = 0; i < splits; i++) {
        const θ = (i / splits) * Math.PI * 2 + jitter(rng, 0.4);
        const α = splitAngle * (1 + jitter(rng, 0.2));
        const childRot: [number, number, number] = [α * Math.cos(θ), θ, α * Math.sin(θ)];
        children.push(
          new Branch({
            ...o,
            at: tip,
            direction: childRot,
            length: o.length * lenF * (1 + jitter(rng, 0.1)),
            radius: o.radius * radF,
            depth: o.depth - 1,
            seed: seed + childOffsets[Math.min(i, childOffsets.length - 1)],
            key: `${o.key ?? 'br'}_${i}`,
          })
        );
      }
    }

    return new Stack3D({
      name: o.tag ?? 'branch',
      at: o.at,
      rot: dir,
      children,
      key: o.key,
    });
  }
}

// ── 3. FoliageCluster ───────────────────────────────────────────────────────

export interface FoliageClusterOpts {
  count?: number;             // default 5
  extent?: [number, number, number]; // half-extents of scatter ellipsoid, default [2.4, 1.2, 2.4]
  radius?: number;            // blob radius, default 1.6
  radiusJitter?: number;      // 0..1 fraction, default 0.25
  color?: ColorInput;
  /** Per-blob HSL jitter (small offsets). Adds non-uniform tint across blobs. */
  hslJitter?: { h?: number; s?: number; l?: number };
  deformAmount?: number;      // default 0.40
  seed?: number;
  at?: [number, number, number]; // cluster center
  tag?: string;
  key?: string;
}

export class FoliageCluster extends StatelessWidget3D {
  private readonly o: FoliageClusterOpts;
  constructor(opts: FoliageClusterOpts = {}) {
    super({ key: opts.key });
    this.o = opts;
  }
  override build(ctx: BuildContext): Widget3D {
    const o = this.o;
    const seed = o.seed ?? Seed.value(ctx, 17);
    const rng = rngFor(seed);
    const color = o.color ?? Palette.color(ctx, 'leaves', 'green');
    const N = o.count ?? 5;
    const ext = o.extent ?? [2.4, 1.2, 2.4];
    const baseR = o.radius ?? 1.6;
    const rJit = o.radiusJitter ?? 0.25;
    const deform = o.deformAmount ?? 0.40;
    const hsl = o.hslJitter;

    const blobs = Array.from({ length: N }, (_, i) => {
      // For i=0 keep at center; rest scatter within the ellipsoid.
      const x = i === 0 ? 0 : (rng() - 0.5) * 2 * ext[0];
      const y = i === 0 ? 0 : (rng() - 0.5) * 2 * ext[1];
      const z = i === 0 ? 0 : (rng() - 0.5) * 2 * ext[2];
      const r = baseR * (1 + jitter(rng, rJit));

      const baseColor = new THREE.Color(typeof color === 'number' ? color : 0x4d7a30);
      // Manually tint per blob via a separate hex if hsl jitter is on.
      let blobColor: ColorInput = color;
      if (hsl) {
        const c = baseColor.clone();
        const h = (hsl.h ?? 0) * jitter(rng, 1);
        const s = (hsl.s ?? 0) * jitter(rng, 1);
        const l = (hsl.l ?? 0) * jitter(rng, 1);
        const hsv = { h: 0, s: 0, l: 0 };
        c.getHSL(hsv);
        c.setHSL(
          ((hsv.h + h) % 1 + 1) % 1,
          Math.max(0, Math.min(1, hsv.s + s)),
          Math.max(0, Math.min(1, hsv.l + l)),
        );
        blobColor = c.getHex();
      }

      return new MeshIcosa({
        r, d: 0,
        deformBox: { amount: deform, seed: seed + i * 6 + 17 },
        at: [x, y, z],
        rot: [0, i * 0.7, 0],
        material: { name: 'ground', opts: { color: blobColor, flatShading: true } },
        tag: `${o.tag ?? 'foliage'}_${i}`,
        key: `blob_${i}`,
      });
    });

    return new Stack3D({
      name: o.tag ?? 'foliage_cluster',
      at: o.at,
      children: blobs,
    });
  }
}

// ── 4. PineCanopy ───────────────────────────────────────────────────────────

export interface PineCanopyOpts {
  layers?: number;
  baseRadius?: number;
  height?: number;
  layerScales?: number[];
  baseY?: number;
  color?: ColorInput;
  deformAmount?: number;
  seed?: number;
  at?: [number, number, number];
  tag?: string;
  key?: string;
}

export class PineCanopy extends StatelessWidget3D {
  private readonly o: PineCanopyOpts;
  constructor(opts: PineCanopyOpts = {}) {
    super({ key: opts.key });
    this.o = opts;
  }
  override build(ctx: BuildContext): Widget3D {
    const o = this.o;
    const seed = o.seed ?? Seed.value(ctx, 7);
    const color = o.color ?? Palette.color(ctx, 'leaves', 'pineGreen');
    const layers = o.layers ?? 4;
    const baseR = o.baseRadius ?? 4;
    const h = o.height ?? 6.3;
    const layerScales = o.layerScales ?? [1.0, 0.75, 0.6, 0.5];
    const baseY = o.baseY ?? 4.85;

    return new Stack3D({
      name: o.tag ?? 'canopy',
      at: o.at,
      children: Array.from({ length: layers }, (_, i) => {
        const scale = layerScales[Math.min(i, layerScales.length - 1)] ?? 0.5;
        // y positions from upstream: 1.3, 2.7, 4.0, 5.0 (layer offset within canopy).
        const yOff = i === 0 ? 1.3 : i === 1 ? 2.7 : i === 2 ? 4.0 : 5.0 + (i - 3) * 0.8;
        return new MeshCone({
          r: baseR * scale, h, rs: 6,
          at: [0, baseY + yOff * scale, 0],
          rot: [0, (i * Math.PI) / 4, 0],
          material: { name: 'ground', opts: { color, flatShading: true } },
          tag: `cone_${i}`,
          key: `cone_${i}`,
        });
      }),
    });
  }
}

// ── 5. PalmFronds ───────────────────────────────────────────────────────────

export interface PalmFrondsOpts {
  count?: number;             // default 7
  length?: number;            // default 4.5
  width?: number;             // default 0.7 (ignored in cone fallback)
  droop?: number;             // 0..1, fraction of length the tip drops, default 0.35
  color?: ColorInput;
  seed?: number;
  at?: [number, number, number];
  tag?: string;
  key?: string;
}

export class PalmFronds extends StatelessWidget3D {
  private readonly o: PalmFrondsOpts;
  constructor(opts: PalmFrondsOpts = {}) {
    super({ key: opts.key });
    this.o = opts;
  }
  override build(ctx: BuildContext): Widget3D {
    const o = this.o;
    const seed = o.seed ?? Seed.value(ctx, 53);
    const rng = rngFor(seed);
    const color = o.color ?? Palette.color(ctx, 'leaves', 'green');
    const N = o.count ?? 7;
    const len = o.length ?? 4.5;
    const droop = o.droop ?? 0.35;

    return new Stack3D({
      name: o.tag ?? 'palm_fronds',
      at: o.at,
      children: Array.from({ length: N }, (_, i) => {
        const θ = (i / N) * Math.PI * 2 + jitter(rng, 0.2);
        // Fronds radiate outward and tilt down (droop * π/2).
        const tilt = (Math.PI / 2) * (1 - droop * 0.5) * 0.6;
        // Use MeshCone as a simple frond (rs=4 makes a flat blade-ish shape).
        return new MeshCone({
          r: 0.35, h: len, rs: 4,
          at: [Math.cos(θ) * len * 0.4, len * 0.3, Math.sin(θ) * len * 0.4],
          rot: [tilt * Math.cos(θ), θ - Math.PI / 2, tilt * Math.sin(θ)],
          material: { name: 'ground', opts: { color, flatShading: true } },
          tag: `frond_${i}`,
          key: `frond_${i}`,
        });
      }),
    });
  }
}

// ── 6. WeepingFronds ────────────────────────────────────────────────────────

export interface WeepingFrondsOpts {
  count?: number;             // default 14
  length?: number;            // default 3.5
  spread?: number;            // horizontal radius of attach points, default 1.8
  color?: ColorInput;
  seed?: number;
  at?: [number, number, number];
  tag?: string;
  key?: string;
}

export class WeepingFronds extends StatelessWidget3D {
  private readonly o: WeepingFrondsOpts;
  constructor(opts: WeepingFrondsOpts = {}) {
    super({ key: opts.key });
    this.o = opts;
  }
  override build(ctx: BuildContext): Widget3D {
    const o = this.o;
    const seed = o.seed ?? Seed.value(ctx, 97);
    const rng = rngFor(seed);
    const color = o.color ?? Palette.color(ctx, 'leaves', 'willowGreen');
    const N = o.count ?? 14;
    const len = o.length ?? 3.5;
    const spread = o.spread ?? 1.8;

    return new Stack3D({
      name: o.tag ?? 'weeping_fronds',
      at: o.at,
      children: Array.from({ length: N }, (_, i) => {
        const θ = (i / N) * Math.PI * 2 + jitter(rng, 0.3);
        const r = spread * (0.6 + rng() * 0.4);
        const lj = len * (0.85 + rng() * 0.3);
        return new MeshCyl({
          rt: 0.04, rb: 0.06, h: lj, rs: 4,
          at: [Math.cos(θ) * r, -lj / 2, Math.sin(θ) * r],
          rot: [jitter(rng, 0.1), 0, jitter(rng, 0.15)],
          material: { name: 'ground', opts: { color, flatShading: true } },
          tag: `frond_${i}`,
          key: `frond_${i}`,
        });
      }),
    });
  }
}

// ── 7. RootFlare ────────────────────────────────────────────────────────────

export interface RootFlareOpts {
  count?: number;             // default 5
  length?: number;            // default 1.3
  thickness?: number;         // default 0.4
  color?: ColorInput;
  seed?: number;
  at?: [number, number, number];
  tag?: string;
  key?: string;
}

export class RootFlare extends StatelessWidget3D {
  private readonly o: RootFlareOpts;
  constructor(opts: RootFlareOpts = {}) {
    super({ key: opts.key });
    this.o = opts;
  }
  override build(ctx: BuildContext): Widget3D {
    const o = this.o;
    const seed = o.seed ?? Seed.value(ctx, 7);
    const rng = rngFor(seed);
    const color = o.color ?? Palette.color(ctx, 'bark', 'pineWood');
    const N = o.count ?? 5;
    const len = o.length ?? 1.3;
    const thick = o.thickness ?? 0.4;

    return new Stack3D({
      name: o.tag ?? 'roots',
      at: o.at,
      children: Array.from({ length: N }, (_, i) => {
        const θ = (i / N) * Math.PI * 2 + jitter(rng, 0.2);
        return new MeshCone({
          r: thick, h: len, rs: 4,
          at: [Math.cos(θ) * len * 0.5, len * 0.4, Math.sin(θ) * len * 0.5],
          // Tilt outward: lay each root nearly horizontal radially.
          rot: [Math.cos(θ) * 1.2, θ, Math.sin(θ) * 1.2],
          material: { name: 'bark', opts: { color, noiseScale: 5 } },
          tag: `root_${i}`,
          key: `root_${i}`,
        });
      }),
    });
  }
}

// ── 8. FallenDebris ─────────────────────────────────────────────────────────

export interface FallenDebrisOpts {
  count?: number;             // default 6
  radius?: number;            // scatter radius, default 2.5
  itemRadius?: number;        // per-item, default 0.25
  color?: ColorInput;
  bare?: boolean;             // if true, color = bark/grey for twigs
  seed?: number;
  at?: [number, number, number];
  tag?: string;
  key?: string;
}

export class FallenDebris extends StatelessWidget3D {
  private readonly o: FallenDebrisOpts;
  constructor(opts: FallenDebrisOpts = {}) {
    super({ key: opts.key });
    this.o = opts;
  }
  override build(ctx: BuildContext): Widget3D {
    const o = this.o;
    const seed = o.seed ?? Seed.value(ctx, 31);
    const rng = rngFor(seed);
    const color = o.bare
      ? (o.color ?? Palette.color(ctx, 'bark', 'pineWood'))
      : (o.color ?? Palette.color(ctx, 'leaves', 'leafGold'));
    const N = o.count ?? 6;
    const R = o.radius ?? 2.5;
    const ir = o.itemRadius ?? 0.25;

    return new Stack3D({
      name: o.tag ?? 'debris',
      at: o.at,
      children: Array.from({ length: N }, (_, i) => {
        const θ = rng() * Math.PI * 2;
        const r = R * (0.5 + rng() * 0.5);
        return new MeshIcosa({
          r: ir * (0.8 + rng() * 0.4), d: 0,
          deformBox: { amount: 0.4, seed: seed + i * 11 },
          at: [Math.cos(θ) * r, 0.05, Math.sin(θ) * r],
          rot: [0, rng() * Math.PI * 2, 0],
          material: { name: 'ground', opts: { color, flatShading: true } },
          tag: `debris_${i}`,
          key: `debris_${i}`,
        });
      }),
    });
  }
}
