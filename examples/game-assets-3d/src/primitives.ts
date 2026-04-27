// Typed primitive factories. All segment counts default to faceted low-poly
// values so AI doesn't have to remember the trick.

import * as THREE from 'three';
import { Shape } from './shape.js';

/** Box (w × h × d), default 1 widthSeg × 1 heightSeg × 1 depthSeg. */
export function box(w: number, h: number, d: number): Shape {
  return new Shape(new THREE.BoxGeometry(w, h, d));
}

/** Sphere — default 12×8 segments for faceted look. */
export function sphere(radius: number, widthSegs = 12, heightSegs = 8): Shape {
  return new Shape(new THREE.SphereGeometry(radius, widthSegs, heightSegs));
}

/** Cylinder — default 6 radial segments for faceted look. */
export function cyl(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  radialSegs = 6,
): Shape {
  return new Shape(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegs));
}

/** Cone — default 6 radial segments. */
export function cone(radius: number, height: number, radialSegs = 6): Shape {
  return new Shape(new THREE.ConeGeometry(radius, height, radialSegs));
}

/** Capsule — default 4 cap, 6 radial. */
export function capsule(
  radius: number,
  length: number,
  capSegs = 4,
  radialSegs = 6,
): Shape {
  return new Shape(new THREE.CapsuleGeometry(radius, length, capSegs, radialSegs));
}

/** Torus — default 6 radial × 14 tubular. */
export function torus(
  radius: number,
  tubeRadius: number,
  radialSegs = 6,
  tubularSegs = 14,
): Shape {
  return new Shape(new THREE.TorusGeometry(radius, tubeRadius, radialSegs, tubularSegs));
}

/** Icosahedron — default detail 0 (raw 20-faced). */
export function icosa(radius: number, detail = 0): Shape {
  return new Shape(new THREE.IcosahedronGeometry(radius, detail));
}

/** Plane — default 1×1 segs (single quad). */
export function plane(width: number, height: number, widthSegs = 1, heightSegs = 1): Shape {
  return new Shape(new THREE.PlaneGeometry(width, height, widthSegs, heightSegs));
}

/** Ring — default 8 thetaSegs. */
export function ring(innerR: number, outerR: number, thetaSegs = 8): Shape {
  return new Shape(new THREE.RingGeometry(innerR, outerR, thetaSegs));
}

/** Tetrahedron — default detail 0. */
export function tetra(radius: number, detail = 0): Shape {
  return new Shape(new THREE.TetrahedronGeometry(radius, detail));
}

/** Octahedron — default detail 0 (8 faces). */
export function octa(radius: number, detail = 0): Shape {
  return new Shape(new THREE.OctahedronGeometry(radius, detail));
}

/** Dodecahedron — default detail 0 (12 faces). */
export function dodeca(radius: number, detail = 0): Shape {
  return new Shape(new THREE.DodecahedronGeometry(radius, detail));
}

// ── Extrude / Lathe (path-based primitives for vertex art) ──────────────────

/** A 2D path command — JSON-clonable so recipes stay simple. */
export type PathCommand =
  | { op: 'moveTo'; x: number; y: number }
  | { op: 'lineTo'; x: number; y: number }
  | { op: 'absarc'; x: number; y: number; radius: number; startAngle: number; endAngle: number; clockwise?: boolean }
  | { op: 'quadraticCurveTo'; cpx: number; cpy: number; x: number; y: number }
  | { op: 'bezierCurveTo'; cp1x: number; cp1y: number; cp2x: number; cp2y: number; x: number; y: number };

export interface ShapePath2D {
  commands: ReadonlyArray<PathCommand>;
  /** Hole sub-paths (windings reversed by ExtrudeGeometry). */
  holes?: ReadonlyArray<ReadonlyArray<PathCommand>>;
}

export interface ExtrudeRecipeArgs {
  shape: ShapePath2D;
  steps?: number;
  depth?: number;
  bevelEnabled?: boolean;
  bevelSegments?: number;
  bevelSize?: number;
  bevelThickness?: number;
  /** Optional 3D path the shape sweeps along (CatmullRom). */
  extrudePath?: ReadonlyArray<[number, number, number]>;
  curveSegments?: number;
}

function buildPath2D(commands: ReadonlyArray<PathCommand>, target: THREE.Path | THREE.Shape): void {
  for (const cmd of commands) {
    switch (cmd.op) {
      case 'moveTo': target.moveTo(cmd.x, cmd.y); break;
      case 'lineTo': target.lineTo(cmd.x, cmd.y); break;
      case 'absarc': target.absarc(cmd.x, cmd.y, cmd.radius, cmd.startAngle, cmd.endAngle, cmd.clockwise ?? false); break;
      case 'quadraticCurveTo': target.quadraticCurveTo(cmd.cpx, cmd.cpy, cmd.x, cmd.y); break;
      case 'bezierCurveTo': target.bezierCurveTo(cmd.cp1x, cmd.cp1y, cmd.cp2x, cmd.cp2y, cmd.x, cmd.y); break;
    }
  }
}

/** Extruded primitive — wraps THREE.ExtrudeGeometry. */
export function extrude(args: ExtrudeRecipeArgs): Shape {
  const shape = new THREE.Shape();
  buildPath2D(args.shape.commands, shape);
  if (args.shape.holes) {
    for (const hole of args.shape.holes) {
      const path = new THREE.Path();
      buildPath2D(hole, path);
      shape.holes.push(path);
    }
  }
  const settings: THREE.ExtrudeGeometryOptions = {
    steps: args.steps ?? 1,
    depth: args.depth ?? 1,
    bevelEnabled: args.bevelEnabled ?? false,
    bevelSegments: args.bevelSegments,
    bevelSize: args.bevelSize,
    bevelThickness: args.bevelThickness,
    curveSegments: args.curveSegments,
  };
  if (args.extrudePath) {
    const pts = args.extrudePath.map(([x, y, z]) => new THREE.Vector3(x, y, z));
    settings.extrudePath = new THREE.CatmullRomCurve3(pts);
  }
  return new Shape(new THREE.ExtrudeGeometry(shape, settings));
}

/** Lathed primitive — revolution surface around the Y axis. */
export function lathe(
  points: ReadonlyArray<[number, number]>,
  segments = 12,
  phiStart = 0,
  phiLength = Math.PI * 2,
): Shape {
  const v2pts = points.map(([x, y]) => new THREE.Vector2(x, y));
  return new Shape(new THREE.LatheGeometry(v2pts, segments, phiStart, phiLength));
}
