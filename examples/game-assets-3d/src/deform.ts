// Vertex deformation modifiers — Shape-extension methods that mutate
// geometry positions for organic / wobbled / faceted looks.
//
// Inspired by interactive-low-poly-environment's `getDeformedCylinder`,
// `getDeformedBox`, `getFlatIcosahedron`, `grassDeformation`, and `deformLog`
// (Roberto Nacu, MIT). The originals were hard-coded against specific
// segment counts (e.g. 8 radial × 4 height → 79 vertices, indexed via
// `if (vertexIndex == 42)`). We re-author them as noise-based mutators
// that work on any geometry — the visual outcome (subtle organic wobble)
// is preserved.

import * as THREE from 'three';
import { Shape } from './shape.js';

// ── mulberry32 deterministic PRNG ───────────────────────────────────────
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface DeformOpts {
  amount?: number;     // displacement magnitude (default varies by deformer)
  seed?: number;       // RNG seed for determinism
  /** Restrict displacement to vertices whose y is within band (relative 0..1).
   *  e.g. [0.7, 1.0] = only top of geometry.
   *  Defaults to entire range.
   */
  yBand?: [number, number];
}

/**
 * Organic wobble — random per-vertex displacement in the XZ plane only
 * (preserves Y / height). Produces the subtle "hand-carved trunk" look the
 * original `getDeformedCylinder` was after.
 *
 * Apply BEFORE setting position/material on the Shape.
 */
export function deformOrganic(shape: Shape, opts: DeformOpts = {}): Shape {
  const amount = opts.amount ?? 0.08;
  const rng = makeRng(opts.seed ?? 1);
  const geom = shape.geom;
  const pos = geom.attributes.position;
  geom.computeBoundingBox();
  const bb = geom.boundingBox!;
  const yMin = bb.min.y, yMax = bb.max.y;
  const yRange = (yMax - yMin) || 1;
  const [yLo, yHi] = opts.yBand ?? [0, 1];

  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const yNorm = (y - yMin) / yRange;
    if (yNorm < yLo || yNorm > yHi) continue;
    const dx = (rng() - 0.5) * 2 * amount;
    const dz = (rng() - 0.5) * 2 * amount;
    pos.setX(i, pos.getX(i) + dx);
    pos.setZ(i, pos.getZ(i) + dz);
  }
  pos.needsUpdate = true;
  geom.computeVertexNormals();
  return shape;
}

/**
 * Box deformation — small jitter on all axes, for chunky-organic rocks.
 * Stronger than `deformOrganic` and isotropic.
 */
export function deformBox(shape: Shape, opts: DeformOpts = {}): Shape {
  const amount = opts.amount ?? 0.10;
  const rng = makeRng(opts.seed ?? 1);
  const geom = shape.geom;
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setX(i, pos.getX(i) + (rng() - 0.5) * 2 * amount);
    pos.setY(i, pos.getY(i) + (rng() - 0.5) * 2 * amount);
    pos.setZ(i, pos.getZ(i) + (rng() - 0.5) * 2 * amount);
  }
  pos.needsUpdate = true;
  geom.computeVertexNormals();
  return shape;
}

/**
 * Flat-faceted look — recompute normals as face-flat (no smoothing). Used
 * by the original repo's `getFlatIcosahedron` to make icosahedra read as
 * cut-stone instead of smooth pebbles. Convert geometry to non-indexed
 * first so each face has unique vertices.
 */
export function deformFlat(shape: Shape): Shape {
  let g = shape.geom;
  if (g.index) {
    g = g.toNonIndexed();
    // Replace the geom on the Shape — reassign by reassigning attributes
    (shape as { geom: THREE.BufferGeometry }).geom = g;
  }
  g.computeVertexNormals();
  return shape;
}

/**
 * Grass-blade deformation — per-vertex Y stretch with jitter, simulating
 * the windswept grass clumps from the original repo. Vertices in the upper
 * yBand get pushed upward + bent.
 */
export function deformGrass(shape: Shape, opts: DeformOpts = {}): Shape {
  const amount = opts.amount ?? 0.4;
  const rng = makeRng(opts.seed ?? 1);
  const geom = shape.geom;
  const pos = geom.attributes.position;
  geom.computeBoundingBox();
  const bb = geom.boundingBox!;
  const yMin = bb.min.y, yMax = bb.max.y;
  const yRange = (yMax - yMin) || 1;

  for (let i = 0; i < pos.count; i++) {
    const yNorm = (pos.getY(i) - yMin) / yRange;
    if (yNorm < 0.5) continue;   // only deform the top half
    const k = (yNorm - 0.5) * 2;  // 0..1
    pos.setY(i, pos.getY(i) + k * amount * (0.5 + rng() * 0.5));
    pos.setX(i, pos.getX(i) + (rng() - 0.5) * amount * 0.4 * k);
    pos.setZ(i, pos.getZ(i) + (rng() - 0.5) * amount * 0.4 * k);
  }
  pos.needsUpdate = true;
  geom.computeVertexNormals();
  return shape;
}

/**
 * Log deformation — squashed cylinder ends + minor side wobble. Used by
 * the original repo for fence rails. Apply to a CylinderGeometry to make
 * it read as a hand-cut log instead of a perfect cylinder.
 */
export function deformLog(shape: Shape, opts: DeformOpts = {}): Shape {
  const amount = opts.amount ?? 0.06;
  const rng = makeRng(opts.seed ?? 1);
  const geom = shape.geom;
  const pos = geom.attributes.position;
  geom.computeBoundingBox();
  const bb = geom.boundingBox!;
  const yMin = bb.min.y, yMax = bb.max.y;
  const yRange = (yMax - yMin) || 1;

  for (let i = 0; i < pos.count; i++) {
    const yNorm = (pos.getY(i) - yMin) / yRange;
    // End-cap squash — vertices near top/bottom get pushed slightly inward
    if (yNorm < 0.1 || yNorm > 0.9) {
      pos.setX(i, pos.getX(i) * 0.92);
      pos.setZ(i, pos.getZ(i) * 0.92);
    }
    // Side wobble — small random kick in X/Z
    pos.setX(i, pos.getX(i) + (rng() - 0.5) * 2 * amount);
    pos.setZ(i, pos.getZ(i) + (rng() - 0.5) * 2 * amount);
  }
  pos.needsUpdate = true;
  geom.computeVertexNormals();
  return shape;
}

// ── Phase D additions: taper, indexed vertex translation, HSL gradient ──

/**
 * Pinch one face of a box-like geometry inward toward the center axis. Used
 * to taper the AirPlane's tail without per-vertex code. `factor` < 1 shrinks
 * vertices on that face away from the centerline by that ratio (factor=0.5
 * → vertices at half their distance from center).
 *
 * The face is decided by the bounding-box extreme — vertices within `tolerance`
 * of the extreme on that axis are considered "on" the face.
 */
export function deformTaper(
  shape: Shape,
  opts: { face: 'front' | 'back' | 'top' | 'bottom' | 'left' | 'right'; factor: number; tolerance?: number },
): Shape {
  const tolerance = opts.tolerance ?? 0.01;
  const geom = shape.geom;
  const pos = geom.attributes.position;
  geom.computeBoundingBox();
  const bb = geom.boundingBox!;

  // Map face → (axis, target value, axes-to-shrink).
  // For x/y/z faces, vertices on that face have their OTHER two axes scaled.
  const faceAxis: Record<typeof opts.face, 'x' | 'y' | 'z'> = {
    right: 'x', left: 'x', top: 'y', bottom: 'y', front: 'z', back: 'z',
  };
  const axis = faceAxis[opts.face];
  const isMin = opts.face === 'left' || opts.face === 'bottom' || opts.face === 'back';
  const target = isMin ? bb.min[axis] : bb.max[axis];

  for (let i = 0; i < pos.count; i++) {
    const v = (axis === 'x') ? pos.getX(i) : (axis === 'y') ? pos.getY(i) : pos.getZ(i);
    if (Math.abs(v - target) > tolerance) continue;
    // Scale the other two axes toward zero by `factor`.
    if (axis !== 'x') pos.setX(i, pos.getX(i) * opts.factor);
    if (axis !== 'y') pos.setY(i, pos.getY(i) * opts.factor);
    if (axis !== 'z') pos.setZ(i, pos.getZ(i) * opts.factor);
  }
  pos.needsUpdate = true;
  geom.computeVertexNormals();
  return shape;
}

/**
 * Translate a list of vertex indices by a fixed offset. Direct port of
 * upstream's per-vertex AirPlane edits. Authors should prefer `deformTaper`
 * for declarative use; this is the escape hatch when the index set matters.
 */
export function deformVertices(
  shape: Shape,
  opts: { indices: ReadonlyArray<number>; offset: [number, number, number] },
): Shape {
  const geom = shape.geom;
  const pos = geom.attributes.position;
  for (const i of opts.indices) {
    if (i >= pos.count) continue;
    pos.setX(i, pos.getX(i) + opts.offset[0]);
    pos.setY(i, pos.getY(i) + opts.offset[1]);
    pos.setZ(i, pos.getZ(i) + opts.offset[2]);
  }
  pos.needsUpdate = true;
  geom.computeVertexNormals();
  return shape;
}

/**
 * Per-vertex HSL gradient → vertex colors. h/s/l can be numbers or functions
 * of (yNorm, vertexIndex) where yNorm is normalized [0..1] across the geom's
 * y-extent. Auto-enables vertexColors on the next material assignment.
 */
export function vertexColorHSL(
  shape: Shape,
  opts: {
    h: number | ((y: number, i: number) => number);
    s: number | ((y: number, i: number) => number);
    l: number | ((y: number, i: number) => number);
  },
): Shape {
  const geom = shape.geom;
  const pos = geom.attributes.position;
  geom.computeBoundingBox();
  const bb = geom.boundingBox!;
  const yMin = bb.min.y, yMax = bb.max.y;
  const yRange = (yMax - yMin) || 1;

  const fn = (v: number | ((y: number, i: number) => number), y: number, i: number): number =>
    typeof v === 'number' ? v : v(y, i);

  const colors = new Float32Array(pos.count * 3);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const yNorm = (pos.getY(i) - yMin) / yRange;
    tmp.setHSL(fn(opts.h, yNorm, i), fn(opts.s, yNorm, i), fn(opts.l, yNorm, i));
    colors[i * 3 + 0] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  // Force the next material assignment to honor vertex colors.
  shape['materialOpts'].vertexColors = true;
  return shape;
}
