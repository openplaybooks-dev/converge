// CSG wrapper — delegates to three-bvh-csg's Brush + Evaluator and manages
// the matrix-world dance + brush construction so callers don't have to.
//
// Used by Shape.cut/.union/.intersect under the hood.

import * as THREE from 'three';
import { Brush, Evaluator, ADDITION, SUBTRACTION, INTERSECTION } from 'three-bvh-csg';

const evaluator = new Evaluator();

export type CsgOp = 'subtract' | 'union' | 'intersect';

interface BrushDesc {
  geometry: THREE.BufferGeometry;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
}

function toBrush(desc: BrushDesc): Brush {
  // three-bvh-csg's typings predate three.js's BufferGeometry generic
  // additions; cast through `any` at the boundary. Geometry shape is
  // identical at runtime.
  const brush = new Brush(desc.geometry as unknown as never);
  if (desc.position) brush.position.set(...desc.position);
  if (desc.rotation) brush.rotation.set(...desc.rotation);
  if (desc.scale != null) {
    if (typeof desc.scale === 'number') brush.scale.setScalar(desc.scale);
    else brush.scale.set(...desc.scale);
  }
  brush.updateMatrixWorld();
  return brush;
}

const OP_MAP = {
  subtract: SUBTRACTION,
  union: ADDITION,
  intersect: INTERSECTION,
} as const;

/**
 * Apply one or more CSG ops to a base geometry. Returns the resulting
 * BufferGeometry baked in world-space (CSG output is world-space, so the
 * caller should NOT re-apply the base position to the resulting Mesh).
 */
export function applyCsg(
  base: BrushDesc,
  ops: Array<{ op: CsgOp; tool: BrushDesc }>,
): THREE.BufferGeometry {
  let brush = toBrush(base);
  for (const { op, tool } of ops) {
    const toolBrush = toBrush(tool);
    const out = new Brush();
    evaluator.evaluate(brush, toolBrush, OP_MAP[op], out);
    brush = out;
  }
  return brush.geometry as unknown as THREE.BufferGeometry;
}
