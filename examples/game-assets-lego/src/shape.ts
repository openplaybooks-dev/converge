// The `Shape` class — low-level chainable wrapper around a BufferGeometry that
// records transform + material + CSG + deformation intent, then materializes
// into a THREE.Mesh on .build().
//
// Authors don't construct Shape directly. The Mesh.* behavior factories
// (src/entity/behaviors/mesh.ts) build Shapes from a recipe + ops list at
// build time. Shape is exported for advanced cases via Mesh.fromShape — its
// surface is documented for that escape hatch only.

import * as THREE from 'three';
import { applyCsg, type CsgOp } from './csg.js';
import { makeMaterial } from './materials.js';
import {
  deformOrganic as _deformOrganic,
  deformBox as _deformBox,
  deformFlat as _deformFlat,
  deformGrass as _deformGrass,
  deformLog as _deformLog,
  deformTaper as _deformTaper,
  deformVertices as _deformVertices,
  vertexColorHSL as _vertexColorHSL,
} from './deform.js';
import type { MaterialName, MaterialOpts } from './types.js';

export class Shape {
  /** Source geometry — primitives.ts builds these. */
  readonly geom: THREE.BufferGeometry;
  /** Transform applied at build time. */
  position: THREE.Vector3 = new THREE.Vector3();
  rotation: THREE.Euler = new THREE.Euler();
  scaleVec: THREE.Vector3 = new THREE.Vector3(1, 1, 1);
  /** Material assigned via `.material()`; null = default toon primary. */
  private materialName: MaterialName = 'toon';
  private materialOpts: MaterialOpts = {};
  /** True when `.material(...)` was called explicitly (vs. default toon). */
  private materialSet: boolean = false;
  /** Pending CSG ops applied at build. */
  private csgOps: Array<{ op: CsgOp; tool: Shape }> = [];
  /** Optional human-readable tag (used by Tells to refer back). */
  tag?: string;
  /** Visibility */
  visible: boolean = true;

  constructor(geom: THREE.BufferGeometry) {
    this.geom = geom;
  }

  // ── Chainable transform ─────────────────────────────────────────────
  at(x: number, y: number, z: number): this {
    this.position.set(x, y, z);
    return this;
  }
  rot(x: number, y: number, z: number): this {
    this.rotation.set(x, y, z);
    return this;
  }
  scale(s: number | [number, number, number]): this {
    if (typeof s === 'number') this.scaleVec.setScalar(s);
    else this.scaleVec.set(...s);
    return this;
  }

  // ── Material ────────────────────────────────────────────────────────
  material(name: MaterialName, opts: MaterialOpts = {}): this {
    this.materialName = name;
    this.materialOpts = opts;
    this.materialSet = true;
    return this;
  }

  // ── CSG ─────────────────────────────────────────────────────────────
  cut(other: Shape): this {
    this.csgOps.push({ op: 'subtract', tool: other });
    return this;
  }
  union(other: Shape): this {
    this.csgOps.push({ op: 'union', tool: other });
    return this;
  }
  intersect(other: Shape): this {
    this.csgOps.push({ op: 'intersect', tool: other });
    return this;
  }

  // ── Tagging (used by Tells to reference back) ──────────────────────
  setTag(name: string): this {
    this.tag = name;
    return this;
  }

  // ── Geometry deformation (chainable; call before .material/.build) ─
  /** Subtle XZ-plane wobble — hand-carved trunk look. */
  deformOrganic(opts?: { amount?: number; seed?: number; yBand?: [number, number] }): this {
    _deformOrganic(this, opts);
    return this;
  }
  /** Isotropic small jitter on all axes — chunky rocks. */
  deformBox(opts?: { amount?: number; seed?: number }): this {
    _deformBox(this, opts);
    return this;
  }
  /** Flat-faceted shading — recompute normals per face. */
  deformFlat(): this {
    _deformFlat(this);
    return this;
  }
  /** Windswept grass-blade deformation on top half. */
  deformGrass(opts?: { amount?: number; seed?: number }): this {
    _deformGrass(this, opts);
    return this;
  }
  /** Hand-cut log — end-cap squash + side wobble. */
  deformLog(opts?: { amount?: number; seed?: number }): this {
    _deformLog(this, opts);
    return this;
  }
  /** Pinch one face inward toward the centerline. */
  deformTaper(opts: { face: 'front' | 'back' | 'top' | 'bottom' | 'left' | 'right'; factor: number; tolerance?: number }): this {
    _deformTaper(this, opts);
    return this;
  }
  /** Translate a list of vertex indices by a fixed offset. */
  deformVertices(opts: { indices: ReadonlyArray<number>; offset: [number, number, number] }): this {
    _deformVertices(this, opts);
    return this;
  }
  /** Per-vertex HSL gradient → vertex colors. */
  vertexColorHSL(opts: {
    h: number | ((y: number, i: number) => number);
    s: number | ((y: number, i: number) => number);
    l: number | ((y: number, i: number) => number);
  }): this {
    _vertexColorHSL(this, opts);
    return this;
  }

  // ── Geometry mutations (call before .build()) ──────────────────────
  /** Apply per-vertex color jitter; auto-enables vertexColors on the material. */
  vertexColorNoise(opts: { color?: number; amount?: number; seed?: number } = {}): this {
    const color = opts.color ?? 0xffffff;
    const amount = opts.amount ?? 0.06;
    const seed = opts.seed ?? 1;
    const pos = this.geom.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const base = new THREE.Color(color);
    let s = seed >>> 0;
    const rand = (): number => {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (let i = 0; i < pos.count; i++) {
      const n = (rand() - 0.5) * 2 * amount;
      colors[i * 3 + 0] = Math.max(0, Math.min(1, base.r + n));
      colors[i * 3 + 1] = Math.max(0, Math.min(1, base.g + n));
      colors[i * 3 + 2] = Math.max(0, Math.min(1, base.b + n));
    }
    this.geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.materialOpts.vertexColors = true;
    return this;
  }

  /** Used by deform helpers (deform.ts) to opt-in vertex colors on the next material assignment. */
  enableVertexColors(): this {
    this.materialOpts.vertexColors = true;
    return this;
  }

  // ── Build (called by Ctx during assemble) ──────────────────────────
  /**
   * Materialize this Shape into a THREE.Mesh, applying any pending CSG.
   * Called by Ctx.assemble. Don't call directly.
   */
  build(): THREE.Mesh {
    let geometry = this.geom;

    // Apply CSG ops in order
    if (this.csgOps.length > 0) {
      const baseDesc = {
        geometry: this.geom,
        position: [this.position.x, this.position.y, this.position.z] as [number, number, number],
        rotation: [this.rotation.x, this.rotation.y, this.rotation.z] as [number, number, number],
        scale: [this.scaleVec.x, this.scaleVec.y, this.scaleVec.z] as [number, number, number],
      };
      const opDescs = this.csgOps.map(({ op, tool }) => ({
        op,
        tool: {
          geometry: tool.geom,
          position: [tool.position.x, tool.position.y, tool.position.z] as [number, number, number],
          rotation: [tool.rotation.x, tool.rotation.y, tool.rotation.z] as [number, number, number],
          scale: [tool.scaleVec.x, tool.scaleVec.y, tool.scaleVec.z] as [number, number, number],
        },
      }));
      geometry = applyCsg(baseDesc, opDescs);
      // CSG output is in world space — don't re-apply base transform
    }

    const material = makeMaterial(this.materialName, this.materialOpts);
    const mesh = new THREE.Mesh(geometry, material);
    if (this.materialSet) mesh.userData.materialExplicit = true;

    if (this.csgOps.length === 0) {
      // No CSG: apply transform to the Mesh
      mesh.position.copy(this.position);
      mesh.rotation.copy(this.rotation);
      mesh.scale.copy(this.scaleVec);
    }
    // (with CSG, geometry is already world-baked — leave Mesh at origin)

    if (this.tag) mesh.name = this.tag;
    mesh.visible = this.visible;
    // Shadow defaults: callers (MeshBehavior.onBuild) pass the inherited
    // Shadows widget config. Without one, shadows stay off — matches the
    // pre-Phase-A behavior so the asset viewer is unchanged.
    mesh.castShadow = this.castShadow ?? false;
    mesh.receiveShadow = this.receiveShadow ?? false;

    return mesh;
  }

  /** Cast-shadow override. Set by MeshBehavior.onBuild after reading the
   *  inherited Shadows widget config. */
  castShadow?: boolean;
  receiveShadow?: boolean;
}
