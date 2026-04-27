// Mesh leaf widgets — thin wrappers around Mesh.* behaviors so meshes appear
// in the widget tree alongside composites. Each widget exposes constructor
// props for the mesh's primitive args + transform + material + tag + bone
// attachment, and emits one Mesh behavior in buildBehaviors.
//
// Authors don't have to know that Mesh.* is the underlying API — they just
// see widgets like MeshBox({ w, h, d, at, material, tag, attach }).

import { Mesh, type MeshBehavior } from '../../entity/behaviors/mesh.js';
import type { Behavior } from '../../entity/types.js';
import type { MaterialName, MaterialOpts } from '../../types.js';
import type { BoneRef } from '../../rig.js';
import type { ExtrudeRecipeArgs, ShapePath2D, PathCommand } from '../../primitives.js';
import { LeafWidget3D, type BuildContext } from '../types.js';

interface MeshCommonOpts {
  at?: [number, number, number];
  rot?: [number, number, number];
  scale?: number | [number, number, number];
  material?: { name: MaterialName; opts?: MaterialOpts };
  tag?: string;
  attach?: BoneRef;
  deformOrganic?: { amount?: number; seed?: number; yBand?: [number, number] };
  deformBox?: { amount?: number; seed?: number };
  deformFlat?: boolean;
  deformGrass?: { amount?: number; seed?: number };
  deformLog?: { amount?: number; seed?: number };
  deformTaper?: { face: 'front' | 'back' | 'top' | 'bottom' | 'left' | 'right'; factor: number; tolerance?: number };
  deformVertices?: { indices: ReadonlyArray<number>; offset: [number, number, number] };
  vertexColorNoise?: { color?: number; amount?: number; seed?: number };
  vertexColorHSL?: {
    h: number | ((y: number, i: number) => number);
    s: number | ((y: number, i: number) => number);
    l: number | ((y: number, i: number) => number);
  };
  key?: string;
}

function applyCommon(b: MeshBehavior, opts: MeshCommonOpts): MeshBehavior {
  if (opts.deformOrganic) b.deformOrganic(opts.deformOrganic);
  if (opts.deformBox) b.deformBox(opts.deformBox);
  if (opts.deformFlat) b.deformFlat();
  if (opts.deformGrass) b.deformGrass(opts.deformGrass);
  if (opts.deformLog) b.deformLog(opts.deformLog);
  if (opts.deformTaper) b.deformTaper(opts.deformTaper);
  if (opts.deformVertices) b.deformVertices(opts.deformVertices);
  if (opts.vertexColorNoise) b.vertexColorNoise(opts.vertexColorNoise);
  if (opts.vertexColorHSL) b.vertexColorHSL(opts.vertexColorHSL);
  if (opts.at) b.at(...opts.at);
  if (opts.rot) b.rot(...opts.rot);
  if (opts.scale != null) b.scale(opts.scale);
  if (opts.material) b.material(opts.material.name, opts.material.opts);
  if (opts.tag) b.tag(opts.tag);
  if (opts.attach !== undefined) b.attach(opts.attach);
  return b;
}

abstract class MeshLeaf extends LeafWidget3D {
  protected readonly common: MeshCommonOpts;
  constructor(common: MeshCommonOpts) {
    super({ key: common.key });
    this.common = common;
  }
  protected abstract makeBehavior(): MeshBehavior;
  override buildBehaviors(_ctx: BuildContext): Behavior[] {
    return [applyCommon(this.makeBehavior(), this.common)];
  }
}

// ── Concrete primitive widgets ────────────────────────────────────────────

export class MeshBox extends MeshLeaf {
  private readonly w: number; private readonly h: number; private readonly d: number;
  constructor(opts: MeshCommonOpts & { w: number; h: number; d: number }) {
    super(opts); this.w = opts.w; this.h = opts.h; this.d = opts.d;
  }
  protected makeBehavior() { return Mesh.box(this.w, this.h, this.d); }
}

export class MeshSphere extends MeshLeaf {
  private readonly r: number; private readonly ws: number; private readonly hs: number;
  constructor(opts: MeshCommonOpts & { r: number; ws?: number; hs?: number }) {
    super(opts); this.r = opts.r; this.ws = opts.ws ?? 12; this.hs = opts.hs ?? 8;
  }
  protected makeBehavior() { return Mesh.sphere(this.r, this.ws, this.hs); }
}

export class MeshCyl extends MeshLeaf {
  private readonly rt: number; private readonly rb: number; private readonly h: number; private readonly rs: number;
  constructor(opts: MeshCommonOpts & { rt: number; rb: number; h: number; rs?: number }) {
    super(opts); this.rt = opts.rt; this.rb = opts.rb; this.h = opts.h; this.rs = opts.rs ?? 6;
  }
  protected makeBehavior() { return Mesh.cyl(this.rt, this.rb, this.h, this.rs); }
}

export class MeshCone extends MeshLeaf {
  private readonly r: number; private readonly h: number; private readonly rs: number;
  constructor(opts: MeshCommonOpts & { r: number; h: number; rs?: number }) {
    super(opts); this.r = opts.r; this.h = opts.h; this.rs = opts.rs ?? 6;
  }
  protected makeBehavior() { return Mesh.cone(this.r, this.h, this.rs); }
}

export class MeshCapsule extends MeshLeaf {
  private readonly r: number; private readonly l: number; private readonly cs: number; private readonly rs: number;
  constructor(opts: MeshCommonOpts & { r: number; l: number; cs?: number; rs?: number }) {
    super(opts); this.r = opts.r; this.l = opts.l; this.cs = opts.cs ?? 4; this.rs = opts.rs ?? 6;
  }
  protected makeBehavior() { return Mesh.capsule(this.r, this.l, this.cs, this.rs); }
}

export class MeshTorus extends MeshLeaf {
  private readonly r: number; private readonly tr: number; private readonly rs: number; private readonly ts: number;
  constructor(opts: MeshCommonOpts & { r: number; tr: number; rs?: number; ts?: number }) {
    super(opts); this.r = opts.r; this.tr = opts.tr; this.rs = opts.rs ?? 6; this.ts = opts.ts ?? 14;
  }
  protected makeBehavior() { return Mesh.torus(this.r, this.tr, this.rs, this.ts); }
}

export class MeshIcosa extends MeshLeaf {
  private readonly r: number; private readonly d: number;
  constructor(opts: MeshCommonOpts & { r: number; d?: number }) {
    super(opts); this.r = opts.r; this.d = opts.d ?? 0;
  }
  protected makeBehavior() { return Mesh.icosa(this.r, this.d); }
}

export class MeshPlane extends MeshLeaf {
  private readonly w: number; private readonly h: number; private readonly ws: number; private readonly hs: number;
  constructor(opts: MeshCommonOpts & { w: number; h: number; ws?: number; hs?: number }) {
    super(opts); this.w = opts.w; this.h = opts.h; this.ws = opts.ws ?? 1; this.hs = opts.hs ?? 1;
  }
  protected makeBehavior() { return Mesh.plane(this.w, this.h, this.ws, this.hs); }
}

export class MeshRing extends MeshLeaf {
  private readonly ir: number; private readonly or: number; private readonly ts: number;
  constructor(opts: MeshCommonOpts & { ir: number; or: number; ts?: number }) {
    super(opts); this.ir = opts.ir; this.or = opts.or; this.ts = opts.ts ?? 8;
  }
  protected makeBehavior() { return Mesh.ring(this.ir, this.or, this.ts); }
}

// ── Phase D additions: Extrude + Lathe ──

export class MeshExtrude extends MeshLeaf {
  private readonly args: ExtrudeRecipeArgs;
  constructor(opts: MeshCommonOpts & ExtrudeRecipeArgs) {
    super(opts);
    this.args = opts;
  }
  protected makeBehavior() { return Mesh.extrude(this.args); }

  /** Plain rectangular outline. */
  static rect(w: number, h: number): ShapePath2D {
    return {
      commands: [
        { op: 'moveTo', x: -w / 2, y: -h / 2 },
        { op: 'lineTo', x:  w / 2, y: -h / 2 },
        { op: 'lineTo', x:  w / 2, y:  h / 2 },
        { op: 'lineTo', x: -w / 2, y:  h / 2 },
        { op: 'lineTo', x: -w / 2, y: -h / 2 },
      ],
    };
  }

  /** Filled circle outline with optional segment count for the polyline approximation. */
  static circle(r: number, segments = 24): ShapePath2D {
    return {
      commands: [{ op: 'absarc', x: 0, y: 0, radius: r, startAngle: 0, endAngle: Math.PI * 2 }],
    };
  }

  /** Annular ring (outer disc minus inner disc) — round window outline. */
  static circleWithHole(outer: number, inner: number, segments = 32): ShapePath2D {
    return {
      commands: [{ op: 'absarc', x: 0, y: 0, radius: outer, startAngle: 0, endAngle: Math.PI * 2 }],
      holes: [
        [{ op: 'absarc', x: 0, y: 0, radius: inner, startAngle: 0, endAngle: Math.PI * 2 }],
      ],
    };
  }

  /**
   * Door silhouette: rectangle bottom + arched top. Width is `w`, total height
   * is `archHeight + h` (rectangular bottom = h, arch on top = archHeight).
   * Matches upstream's House door outline.
   */
  static dome(w: number, h: number, archHeight: number, segments = 8): ShapePath2D {
    const halfW = w / 2;
    const cmds: PathCommand[] = [
      { op: 'moveTo', x: -halfW, y: -h / 2 },
      { op: 'lineTo', x:  halfW, y: -h / 2 },
      { op: 'lineTo', x:  halfW, y:  h / 2 },
    ];
    // Arch as N-segment polyline.
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const angle = Math.PI * (1 - t);
      cmds.push({
        op: 'lineTo',
        x: halfW * Math.cos(angle),
        y: h / 2 + archHeight * Math.sin(angle),
      });
    }
    cmds.push({ op: 'lineTo', x: -halfW, y: -h / 2 });
    return { commands: cmds };
  }
}

export class MeshLathe extends MeshLeaf {
  private readonly points: ReadonlyArray<[number, number]>;
  private readonly segments: number;
  private readonly phiStart: number;
  private readonly phiLength: number;
  constructor(opts: MeshCommonOpts & {
    points: ReadonlyArray<[number, number]>;
    segments?: number;
    phiStart?: number;
    phiLength?: number;
  }) {
    super(opts);
    this.points = opts.points;
    this.segments = opts.segments ?? 12;
    this.phiStart = opts.phiStart ?? 0;
    this.phiLength = opts.phiLength ?? Math.PI * 2;
  }
  protected makeBehavior() { return Mesh.lathe(this.points, this.segments, this.phiStart, this.phiLength); }
}
