// Mesh.* — primitive factories that wrap the existing Shape class.
//
// Each call returns a MeshBehavior. Internally we store a "recipe" — the
// primitive factory + its args, plus an ordered list of chained ops (at, rot,
// material, deform, …). Each onBuild rebuilds a fresh Shape from the recipe
// and replays the ops. This makes:
//   - clone trivial (recipes are JSON-clonable; the new behavior shares no
//     Shape state with the original)
//   - rebuild idempotent (same entity built twice = same output, no aliasing)
//
// CSG remains a constraint: cut/union/intersect take another MeshBehavior, and
// when cloning we must clone that behavior too so its recipe re-runs against
// the cloned entity's primitives.

import * as P from '../../primitives.js';
import { Shape } from '../../shape.js';
import type { MaterialName, MaterialOpts } from '../../types.js';
import type { Behavior, BuildCtx } from '../types.js';
import type { BoneRef } from '../../rig.js';

type PrimitiveKind =
  | 'box' | 'sphere' | 'cyl' | 'cone' | 'capsule' | 'torus'
  | 'icosa' | 'plane' | 'ring' | 'tetra' | 'octa' | 'dodeca'
  | 'extrude' | 'lathe';

interface PrimitiveRecipe {
  kind: PrimitiveKind;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any[];
}

type Op =
  | { kind: 'at'; v: [number, number, number] }
  | { kind: 'rot'; v: [number, number, number] }
  | { kind: 'scale'; v: number | [number, number, number] }
  | { kind: 'material'; name: MaterialName; opts: MaterialOpts }
  | { kind: 'cut' | 'union' | 'intersect'; tool: MeshBehavior }
  | { kind: 'deformOrganic'; opts?: { amount?: number; seed?: number; yBand?: [number, number] } }
  | { kind: 'deformBox'; opts?: { amount?: number; seed?: number } }
  | { kind: 'deformFlat' }
  | { kind: 'deformGrass'; opts?: { amount?: number; seed?: number } }
  | { kind: 'deformLog'; opts?: { amount?: number; seed?: number } }
  | { kind: 'deformTaper'; opts: { face: 'front' | 'back' | 'top' | 'bottom' | 'left' | 'right'; factor: number; tolerance?: number } }
  | { kind: 'deformVertices'; opts: { indices: ReadonlyArray<number>; offset: [number, number, number] } }
  | { kind: 'vertexColorNoise'; opts: { color?: number; amount?: number; seed?: number } }
  | { kind: 'vertexColorHSL'; opts: {
      h: number | ((y: number, i: number) => number);
      s: number | ((y: number, i: number) => number);
      l: number | ((y: number, i: number) => number);
    } };

interface MeshConfig {
  recipe: PrimitiveRecipe;
  ops: Op[];
  tag?: string;
  attachTo?: BoneRef;
}

export interface MeshBehavior extends Behavior<MeshConfig> {
  kind: 'mesh';
  at(x: number, y: number, z: number): MeshBehavior;
  rot(x: number, y: number, z: number): MeshBehavior;
  scale(s: number | [number, number, number]): MeshBehavior;
  material(name: MaterialName, opts?: MaterialOpts): MeshBehavior;
  cut(other: MeshBehavior): MeshBehavior;
  union(other: MeshBehavior): MeshBehavior;
  intersect(other: MeshBehavior): MeshBehavior;
  tag(name: string): MeshBehavior;
  deformOrganic(opts?: { amount?: number; seed?: number; yBand?: [number, number] }): MeshBehavior;
  deformBox(opts?: { amount?: number; seed?: number }): MeshBehavior;
  deformFlat(): MeshBehavior;
  deformGrass(opts?: { amount?: number; seed?: number }): MeshBehavior;
  deformLog(opts?: { amount?: number; seed?: number }): MeshBehavior;
  deformTaper(opts: { face: 'front' | 'back' | 'top' | 'bottom' | 'left' | 'right'; factor: number; tolerance?: number }): MeshBehavior;
  deformVertices(opts: { indices: ReadonlyArray<number>; offset: [number, number, number] }): MeshBehavior;
  vertexColorNoise(opts?: { color?: number; amount?: number; seed?: number }): MeshBehavior;
  vertexColorHSL(opts: {
    h: number | ((y: number, i: number) => number);
    s: number | ((y: number, i: number) => number);
    l: number | ((y: number, i: number) => number);
  }): MeshBehavior;
  /** Rigid-attach this mesh to a rig bone at build time (instead of the entity root). */
  attach(boneRef: BoneRef): MeshBehavior;
}

const PRIMITIVE_FACTORIES: Record<PrimitiveKind, (...args: number[]) => Shape> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  box: P.box as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sphere: P.sphere as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cyl: P.cyl as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cone: P.cone as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  capsule: P.capsule as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  torus: P.torus as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icosa: P.icosa as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plane: P.plane as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ring: P.ring as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tetra: P.tetra as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  octa: P.octa as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dodeca: P.dodeca as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extrude: P.extrude as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lathe: P.lathe as any,
};

/** Execute a recipe → produce a fresh Shape with all ops replayed. */
function buildShape(config: MeshConfig): Shape {
  const factory = PRIMITIVE_FACTORIES[config.recipe.kind];
  const shape = factory(...config.recipe.args);
  for (const op of config.ops) {
    switch (op.kind) {
      case 'at': shape.at(...op.v); break;
      case 'rot': shape.rot(...op.v); break;
      case 'scale': shape.scale(op.v); break;
      case 'material': shape.material(op.name, op.opts); break;
      case 'cut': shape.cut(buildShape(op.tool.config)); break;
      case 'union': shape.union(buildShape(op.tool.config)); break;
      case 'intersect': shape.intersect(buildShape(op.tool.config)); break;
      case 'deformOrganic': shape.deformOrganic(op.opts); break;
      case 'deformBox': shape.deformBox(op.opts); break;
      case 'deformFlat': shape.deformFlat(); break;
      case 'deformGrass': shape.deformGrass(op.opts); break;
      case 'deformLog': shape.deformLog(op.opts); break;
      case 'deformTaper': shape.deformTaper(op.opts); break;
      case 'deformVertices': shape.deformVertices(op.opts); break;
      case 'vertexColorNoise': shape.vertexColorNoise(op.opts); break;
      case 'vertexColorHSL': shape.vertexColorHSL(op.opts); break;
    }
  }
  if (config.tag) shape.setTag(config.tag);
  return shape;
}

function makeBehavior(recipe: PrimitiveRecipe): MeshBehavior {
  const config: MeshConfig = { recipe, ops: [] };

  const b: MeshBehavior = {
    kind: 'mesh',
    config,
    at(x, y, z) { config.ops.push({ kind: 'at', v: [x, y, z] }); return b; },
    rot(x, y, z) { config.ops.push({ kind: 'rot', v: [x, y, z] }); return b; },
    scale(s) { config.ops.push({ kind: 'scale', v: s }); return b; },
    material(n, opts) { config.ops.push({ kind: 'material', name: n, opts: opts ?? {} }); return b; },
    cut(o) { config.ops.push({ kind: 'cut', tool: o }); return b; },
    union(o) { config.ops.push({ kind: 'union', tool: o }); return b; },
    intersect(o) { config.ops.push({ kind: 'intersect', tool: o }); return b; },
    tag(name) { config.tag = name; return b; },
    deformOrganic(o) { config.ops.push({ kind: 'deformOrganic', opts: o }); return b; },
    deformBox(o) { config.ops.push({ kind: 'deformBox', opts: o }); return b; },
    deformFlat() { config.ops.push({ kind: 'deformFlat' }); return b; },
    deformGrass(o) { config.ops.push({ kind: 'deformGrass', opts: o }); return b; },
    deformLog(o) { config.ops.push({ kind: 'deformLog', opts: o }); return b; },
    deformTaper(o) { config.ops.push({ kind: 'deformTaper', opts: o }); return b; },
    deformVertices(o) { config.ops.push({ kind: 'deformVertices', opts: o }); return b; },
    vertexColorNoise(o) { config.ops.push({ kind: 'vertexColorNoise', opts: o ?? {} }); return b; },
    vertexColorHSL(o) { config.ops.push({ kind: 'vertexColorHSL', opts: o }); return b; },
    attach(boneRef) { config.attachTo = boneRef; return b; },

    onBuild(ctx: BuildCtx) {
      // Resolve inherited shadow defaults set by the Shadows widget.
      const shadowsCfg = ctx.refs.get('__shadowsConfig') as
        | { cast?: boolean; receive?: boolean }
        | undefined;
      const shape = buildShape(config);
      if (shadowsCfg?.cast != null) shape.castShadow = shadowsCfg.cast;
      if (shadowsCfg?.receive != null) shape.receiveShadow = shadowsCfg.receive;
      const mesh = shape.build();
      if (config.tag) ctx.refs.set(config.tag, mesh);

      if (config.attachTo !== undefined) {
        const rig = ctx.refs.get('rig') as
          | { resolve: (ref: BoneRef) => import('three').Bone }
          | undefined;
        if (rig) {
          rig.resolve(config.attachTo).add(mesh);
          return {};
        }
        console.warn(
          `[entity] Mesh.attach(${String(config.attachTo)}) on entity without a Rig — ` +
            `attaching under entity root instead.`,
        );
      }
      return { object: mesh };
    },

    onClone() {
      const fresh = makeBehavior({ ...config.recipe, args: [...config.recipe.args] });
      fresh.config.tag = config.tag;
      fresh.config.attachTo = config.attachTo;
      // Replay ops. Tool meshes (cut/union/intersect) are deep-cloned so the
      // new chain owns its own tool behaviors.
      for (const op of config.ops) {
        if (op.kind === 'cut' || op.kind === 'union' || op.kind === 'intersect') {
          fresh.config.ops.push({ kind: op.kind, tool: op.tool.onClone!() as MeshBehavior });
        } else {
          fresh.config.ops.push({ ...op });
        }
      }
      return fresh;
    },
  };
  return b;
}

export const Mesh = {
  box: (w: number, h: number, d: number) => makeBehavior({ kind: 'box', args: [w, h, d] }),
  sphere: (r: number, ws = 12, hs = 8) => makeBehavior({ kind: 'sphere', args: [r, ws, hs] }),
  cyl: (rt: number, rb: number, h: number, rs = 6) =>
    makeBehavior({ kind: 'cyl', args: [rt, rb, h, rs] }),
  cone: (r: number, h: number, rs = 6) => makeBehavior({ kind: 'cone', args: [r, h, rs] }),
  capsule: (r: number, l: number, cs = 4, rs = 6) =>
    makeBehavior({ kind: 'capsule', args: [r, l, cs, rs] }),
  torus: (r: number, tr: number, rs = 6, ts = 14) =>
    makeBehavior({ kind: 'torus', args: [r, tr, rs, ts] }),
  icosa: (r: number, d = 0) => makeBehavior({ kind: 'icosa', args: [r, d] }),
  plane: (w: number, h: number, ws = 1, hs = 1) =>
    makeBehavior({ kind: 'plane', args: [w, h, ws, hs] }),
  ring: (ir: number, or: number, ts = 8) => makeBehavior({ kind: 'ring', args: [ir, or, ts] }),
  tetra: (r: number, d = 0) => makeBehavior({ kind: 'tetra', args: [r, d] }),
  octa: (r: number, d = 0) => makeBehavior({ kind: 'octa', args: [r, d] }),
  dodeca: (r: number, d = 0) => makeBehavior({ kind: 'dodeca', args: [r, d] }),
  extrude: (args: P.ExtrudeRecipeArgs) => makeBehavior({ kind: 'extrude', args: [args] }),
  lathe: (points: ReadonlyArray<[number, number]>, segments = 12, phiStart = 0, phiLength = Math.PI * 2) =>
    makeBehavior({ kind: 'lathe', args: [points, segments, phiStart, phiLength] }),
} as const;
