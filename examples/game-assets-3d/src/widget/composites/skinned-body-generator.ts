// Skinned humanoid geometry generator.
//
// Produces a single THREE.BufferGeometry representing a continuous humanoid
// body, with per-vertex skinIndex/skinWeight attributes that bind the mesh to
// our detailed humanoid rig. The result, wrapped in a THREE.SkinnedMesh and
// bound to rig.skeleton, deforms smoothly across joints when bones rotate.
//
// Algorithm:
// 1. Read bone rest positions from the rig (assumes bones are at rest pose
//    in world coordinates relative to the rig root).
// 2. For each anatomical region (chest, arm, leg, ...), define a "tube" with
//    a profile (radius along its axis), a primary bone, and optional seam
//    bones at the start/end where vertices blend with the adjacent bone.
// 3. For each region, generate H+1 rings of N=16 vertices, each ring placed
//    along the region's axis. Compute skin weights based on ring position:
//    - Mid-region rings: 100% primary bone
//    - Within 2 rings of a seam: blend with the seam's adjacent bone using
//      a 0.5 / 0.75 / 1.0 falloff, so the seam ring itself is 50/50.
// 4. Connect adjacent rings with quads (split into two triangles each).
// 5. Close end caps with pole vertices for head/hand/foot stubs.
// 6. Compute smooth normals and emit a single BufferGeometry.

import * as THREE from 'three';
import type { ResolvedRig } from '../../rig.js';

// ── Public surface ──────────────────────────────────────────────────────────

export interface BodyProfileParams {
  /** Overall vertical scale (1.0 = adult, 0.65 = child). Applied as Y-axis scale on output geometry. */
  height?: number;
  build?: 'thin' | 'average' | 'broad';

  // Width multipliers (default 1.0; valid range ~0.6..1.5).
  shoulderWidth?: number;
  waistWidth?: number;
  hipWidth?: number;
  /** Front-to-back fullness on the upper torso. Post-process scale on Z. */
  chestDepth?: number;
  neckThickness?: number;

  /** 0..1 — controls bicep/calf bulge magnitude. 0 = cylindrical, 1 = pronounced. */
  muscleDefinition?: number;

  // Proportions
  legLength?: number;
  armLength?: number;
  headSize?: number;
}

export interface SkinnedBodyResult {
  geometry: THREE.BufferGeometry;
  vertexCount: number;
  /** bone-name → skinIndex (matches rig.skeleton.bones[i] order). */
  boneIndexMap: ReadonlyMap<string, number>;
}

// ── Profile control points (radius multipliers along axis) ──────────────────

interface Profile {
  /** [t (0..1 along axis), r (radius multiplier)]. Strictly increasing t. */
  points: ReadonlyArray<readonly [number, number]>;
}

const CHEST_PROFILE: Profile = {
  points: [
    [0.00, 0.95],
    [0.20, 1.05],
    [0.40, 1.10],   // sternum / chest broadest
    [0.60, 1.05],
    [0.85, 0.92],
    [1.00, 0.85],   // shoulder seam
  ],
};
const LUMBAR_PROFILE: Profile = {
  points: [
    [0.00, 1.00],
    [0.30, 0.92],
    [0.55, 0.88],   // waist narrowest
    [0.80, 0.94],
    [1.00, 1.00],
  ],
};
const PELVIS_PROFILE: Profile = {
  points: [
    [0.00, 1.00],
    [0.30, 1.05],
    [0.65, 1.10],   // hip widest
    [1.00, 1.00],
  ],
};
const NECK_PROFILE: Profile = {
  points: [
    [0.00, 1.05],
    [0.50, 0.95],
    [1.00, 0.85],
  ],
};
const HEAD_PROFILE: Profile = {
  points: [
    [0.00, 0.40],   // bottom (jaw)
    [0.20, 0.80],
    [0.40, 1.00],   // cheek widest
    [0.60, 1.00],
    [0.80, 0.80],
    [0.95, 0.40],
    [1.00, 0.05],   // crown (tapered to pole)
  ],
};
const UPPER_ARM_PROFILE: Profile = {
  points: [
    [0.00, 0.85],
    [0.15, 1.00],
    [0.40, 1.10],   // bicep bulge
    [0.60, 1.05],
    [0.85, 0.92],
    [1.00, 0.80],   // elbow narrow
  ],
};
const FOREARM_PROFILE: Profile = {
  points: [
    [0.00, 0.95],
    [0.20, 1.05],   // forearm muscle bulge
    [0.45, 1.00],
    [0.70, 0.85],
    [1.00, 0.70],   // wrist
  ],
};
const HAND_PROFILE: Profile = {
  points: [
    [0.00, 1.00],
    [0.50, 1.00],
    [1.00, 0.20],
  ],
};
const THIGH_PROFILE: Profile = {
  points: [
    [0.00, 0.95],
    [0.15, 1.10],
    [0.35, 1.15],   // mid thigh peak
    [0.55, 1.05],
    [0.80, 0.92],
    [1.00, 0.80],   // knee
  ],
};
const SHIN_PROFILE: Profile = {
  points: [
    [0.00, 0.95],
    [0.15, 1.10],
    [0.35, 1.18],   // calf bulge
    [0.60, 1.05],
    [0.85, 0.85],
    [1.00, 0.75],   // ankle
  ],
};
const FOOT_PROFILE: Profile = {
  points: [
    [0.00, 1.00],
    [0.60, 1.00],
    [1.00, 0.30],
  ],
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function lerpProfile(profile: Profile, t: number): number {
  const pts = profile.points;
  if (t <= pts[0][0]) return pts[0][1];
  if (t >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
  for (let i = 1; i < pts.length; i++) {
    const [t1, r1] = pts[i];
    if (t <= t1) {
      const [t0, r0] = pts[i - 1];
      const u = (t - t0) / (t1 - t0);
      return r0 + (r1 - r0) * u;
    }
  }
  return pts[pts.length - 1][1];
}

function buildScale(build: BodyProfileParams['build']): number {
  return build === 'thin' ? 0.85 : build === 'broad' ? 1.18 : 1.0;
}

/** Compute a stable "right" perpendicular vector to an axis for ring framing. */
function computeRingRight(axis: THREE.Vector3): THREE.Vector3 {
  // Pick the world axis least aligned with `axis` to ensure non-degenerate cross.
  const up = Math.abs(axis.y) < 0.95
    ? new THREE.Vector3(0, 1, 0)
    : new THREE.Vector3(1, 0, 0);
  return new THREE.Vector3().crossVectors(axis, up).normalize();
}

// ── Region descriptor ───────────────────────────────────────────────────────

interface Region {
  id: string;
  primaryBone: string;
  /** Bone whose vertices blend with primary at the start (t=0). */
  startSeamBone?: string;
  /** Bone whose vertices blend with primary at the end (t=1). */
  endSeamBone?: string;
  /** World-space rest origin (matches primaryBone position). */
  origin: THREE.Vector3;
  /** Unit direction along which the region extends. */
  axis: THREE.Vector3;
  /** Length along the axis from origin. */
  length: number;
  /** Profile (radius multiplier along t in [0,1]). */
  profile: Profile;
  /** Base radius (multiplied with profile r at each ring). */
  baseRadius: number;
  /** Ring count = heightSegments + 1. Default 6 rings = 5 segments. */
  heightSegments: number;
  /** Radial segments per ring. Default 16. */
  radialSegments: number;
  /** Close the start ring to a pole vertex (for caps). */
  startCap?: boolean;
  /** Close the end ring to a pole vertex. */
  endCap?: boolean;
}

// ── MeshBuilder ─────────────────────────────────────────────────────────────

class MeshBuilder {
  positions: number[] = [];
  skinIndices: number[] = [];
  skinWeights: number[] = [];
  indices: number[] = [];

  pushVertex(p: THREE.Vector3, sIdx: [number, number, number, number], sWt: [number, number, number, number]): number {
    const i = this.positions.length / 3;
    this.positions.push(p.x, p.y, p.z);
    this.skinIndices.push(sIdx[0], sIdx[1], sIdx[2], sIdx[3]);
    this.skinWeights.push(sWt[0], sWt[1], sWt[2], sWt[3]);
    return i;
  }

  /** Push two triangles forming a quad between four ring-vertex indices. */
  quad(a: number, b: number, c: number, d: number): void {
    // a,b,c,d ordered so abc + acd are CCW from outside.
    this.indices.push(a, b, c, a, c, d);
  }

  toBufferGeometry(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.skinIndices, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.skinWeights, 4));
    g.setIndex(this.indices);
    g.computeVertexNormals();
    return g;
  }
}

// ── Skin weight computation ─────────────────────────────────────────────────

interface SkinW {
  idxA: number; wA: number;
  idxB: number; wB: number;
}

/**
 * For a vertex at ring `k` in a region of `H` total ring-segments (so ring
 * indices go 0..H), compute the skin weight blend:
 *   - Within 2 rings of the start seam: blend toward startSeamBone
 *   - Within 2 rings of the end seam:   blend toward endSeamBone
 *   - Otherwise: 100% primaryBone
 */
function computeRingSkin(
  k: number,
  H: number,
  region: Region,
  boneIdx: ReadonlyMap<string, number>,
): SkinW {
  const primary = boneIdx.get(region.primaryBone) ?? 0;

  // Start seam blend (k=0 is at the seam).
  if (region.startSeamBone && k <= 2) {
    const startSeam = boneIdx.get(region.startSeamBone) ?? 0;
    const blend = 0.5 + (k / 2) * 0.5; // k=0 → 0.5, k=1 → 0.75, k=2 → 1.0
    return { idxA: primary, wA: blend, idxB: startSeam, wB: 1 - blend };
  }
  // End seam blend (k=H is at the seam).
  if (region.endSeamBone && k >= H - 2) {
    const endSeam = boneIdx.get(region.endSeamBone) ?? 0;
    const dk = H - k; // dk=2 → far, dk=0 → at seam
    const blend = 0.5 + (dk / 2) * 0.5;
    return { idxA: primary, wA: blend, idxB: endSeam, wB: 1 - blend };
  }
  return { idxA: primary, wA: 1, idxB: primary, wB: 0 };
}

// ── Region generation ───────────────────────────────────────────────────────

function generateRegion(
  builder: MeshBuilder,
  region: Region,
  boneIdx: ReadonlyMap<string, number>,
  muscleK: number,
): void {
  const N = region.radialSegments;
  const H = region.heightSegments;
  const right = computeRingRight(region.axis);
  const fwd = new THREE.Vector3().crossVectors(region.axis, right).normalize();

  // Storage for ring vertex indices to connect quads.
  const ringIndices: number[][] = [];

  for (let k = 0; k <= H; k++) {
    const t = k / H;
    const profileR = lerpProfile(region.profile, t);
    // Apply muscle scaling: deviation from 1.0 is multiplied by muscleK.
    const scaledR = 1 + (profileR - 1) * muscleK;
    const radius = region.baseRadius * scaledR;

    const center = region.origin.clone()
      .addScaledVector(region.axis, t * region.length);

    const skin = computeRingSkin(k, H, region, boneIdx);

    // Start cap: collapse first ring to a pole.
    if (k === 0 && region.startCap) {
      const idx = builder.pushVertex(
        center,
        [skin.idxA, skin.idxB, 0, 0],
        [skin.wA, skin.wB, 0, 0],
      );
      ringIndices.push(new Array(N).fill(idx));
      continue;
    }
    // End cap.
    if (k === H && region.endCap) {
      const idx = builder.pushVertex(
        center,
        [skin.idxA, skin.idxB, 0, 0],
        [skin.wA, skin.wB, 0, 0],
      );
      ringIndices.push(new Array(N).fill(idx));
      continue;
    }

    const ring: number[] = [];
    for (let s = 0; s < N; s++) {
      const phi = (s / N) * Math.PI * 2;
      const local = new THREE.Vector3()
        .addScaledVector(right, Math.cos(phi) * radius)
        .addScaledVector(fwd, Math.sin(phi) * radius);
      const pos = center.clone().add(local);
      const vi = builder.pushVertex(
        pos,
        [skin.idxA, skin.idxB, 0, 0],
        [skin.wA, skin.wB, 0, 0],
      );
      ring.push(vi);
    }
    ringIndices.push(ring);
  }

  // Stitch rings.
  for (let k = 0; k < H; k++) {
    const r0 = ringIndices[k];
    const r1 = ringIndices[k + 1];
    for (let s = 0; s < N; s++) {
      const sNext = (s + 1) % N;
      const a = r0[s];
      const b = r0[sNext];
      const c = r1[sNext];
      const d = r1[s];
      // Skip degenerate quads if both rings collapsed to the same pole.
      if (a === b && c === d) continue;
      builder.quad(a, b, c, d);
    }
  }
}

// ── Main entry ──────────────────────────────────────────────────────────────

export function generateSkinnedHumanoidGeometry(
  rig: ResolvedRig,
  params: BodyProfileParams = {},
): SkinnedBodyResult {
  // 1. Force-update bone matrices to ensure we read accurate world positions.
  rig.root.updateMatrixWorld(true);

  // 2. Bone positions in world (= rig-root) space.
  const boneWorld = (name: string): THREE.Vector3 => {
    const b = rig.bones[name];
    if (!b) throw new Error(`[skinned-body] bone '${name}' not found in rig`);
    const v = new THREE.Vector3();
    b.getWorldPosition(v);
    return v;
  };

  // 3. Bone-name → skinIndex map (matches rig.skeleton bone order).
  const boneList = Object.keys(rig.bones);
  const boneIdx = new Map<string, number>();
  boneList.forEach((name, i) => boneIdx.set(name, i));

  // 4. Resolve params with defaults.
  const build = params.build ?? 'average';
  const buildK = buildScale(build);
  const muscle = params.muscleDefinition ?? 0.5;
  const muscleK = 0.5 + 0.5 * muscle;
  const shoulderW = params.shoulderWidth ?? 1.0;
  const waistW = params.waistWidth ?? 1.0;
  const hipW = params.hipWidth ?? 1.0;
  const headK = params.headSize ?? 1.0;
  const neckK = params.neckThickness ?? 1.0;
  const armLen = clamp(params.armLength ?? 1.0, 0.85, 1.15);
  const legLen = clamp(params.legLength ?? 1.0, 0.85, 1.15);

  const builder = new MeshBuilder();

  // 5. Build regions.
  // ── Pelvis (cap → lumbar) ──
  const pelvisPos = boneWorld('pelvis');
  const lumbarPos = boneWorld('lumbar');
  const pelvisAxis = new THREE.Vector3().subVectors(lumbarPos, pelvisPos).normalize();
  const pelvisLen = lumbarPos.distanceTo(pelvisPos);
  generateRegion(builder, {
    id: 'pelvis',
    primaryBone: 'pelvis',
    endSeamBone: 'lumbar',
    origin: pelvisPos.clone().addScaledVector(pelvisAxis, -0.06),
    axis: pelvisAxis,
    length: pelvisLen + 0.06,
    profile: PELVIS_PROFILE,
    baseRadius: 0.16 * buildK * hipW,
    heightSegments: 5,
    radialSegments: 16,
    startCap: true,
  }, boneIdx, muscleK);

  // ── Lumbar (waist) ──
  const spinePos = boneWorld('spine');
  const lumbarAxis = new THREE.Vector3().subVectors(spinePos, lumbarPos).normalize();
  const lumbarLen = spinePos.distanceTo(lumbarPos);
  generateRegion(builder, {
    id: 'lumbar',
    primaryBone: 'lumbar',
    startSeamBone: 'pelvis',
    endSeamBone: 'spine',
    origin: lumbarPos,
    axis: lumbarAxis,
    length: lumbarLen,
    profile: LUMBAR_PROFILE,
    baseRadius: 0.155 * buildK * waistW,
    heightSegments: 5,
    radialSegments: 16,
  }, boneIdx, muscleK);

  // ── Spine (lower torso) — short connector ──
  const chestPos = boneWorld('chest');
  const spineAxis = new THREE.Vector3().subVectors(chestPos, spinePos).normalize();
  const spineLen = chestPos.distanceTo(spinePos);
  generateRegion(builder, {
    id: 'spine',
    primaryBone: 'spine',
    startSeamBone: 'lumbar',
    endSeamBone: 'chest',
    origin: spinePos,
    axis: spineAxis,
    length: spineLen,
    profile: { points: [[0, 1.0], [1, 1.0]] },
    baseRadius: 0.17 * buildK,
    heightSegments: 3,
    radialSegments: 16,
  }, boneIdx, muscleK);

  // ── Chest ──
  const neckPos = boneWorld('neck');
  const chestAxis = new THREE.Vector3().subVectors(neckPos, chestPos).normalize();
  const chestLen = neckPos.distanceTo(chestPos);
  generateRegion(builder, {
    id: 'chest',
    primaryBone: 'chest',
    startSeamBone: 'spine',
    endSeamBone: 'neck',
    origin: chestPos,
    axis: chestAxis,
    length: chestLen,
    profile: CHEST_PROFILE,
    baseRadius: 0.20 * buildK * shoulderW,
    heightSegments: 6,
    radialSegments: 16,
  }, boneIdx, muscleK);

  // ── Neck ──
  const headPos = boneWorld('head');
  const neckAxis = new THREE.Vector3().subVectors(headPos, neckPos).normalize();
  const neckLen = headPos.distanceTo(neckPos);
  generateRegion(builder, {
    id: 'neck',
    primaryBone: 'neck',
    startSeamBone: 'chest',
    endSeamBone: 'head',
    origin: neckPos,
    axis: neckAxis,
    length: neckLen,
    profile: NECK_PROFILE,
    baseRadius: 0.075 * buildK * neckK,
    heightSegments: 3,
    radialSegments: 16,
  }, boneIdx, muscleK);

  // ── Head (closed cap at top) ──
  generateRegion(builder, {
    id: 'head',
    primaryBone: 'head',
    startSeamBone: 'neck',
    origin: headPos,
    axis: new THREE.Vector3(0, 1, 0),
    length: 0.30 * headK,
    profile: HEAD_PROFILE,
    baseRadius: 0.16 * headK,
    heightSegments: 7,
    radialSegments: 16,
    endCap: true,
  }, boneIdx, muscleK);

  // ── Arms (right + left) ──
  for (const side of ['R', 'L'] as const) {
    const armOrigin = boneWorld(`arm_${side}`);
    const forearmOrigin = boneWorld(`forearm_${side}`);
    const handOrigin = boneWorld(`hand_${side}`);

    const upperAxis = new THREE.Vector3().subVectors(forearmOrigin, armOrigin).normalize();
    const upperLen = forearmOrigin.distanceTo(armOrigin) * armLen;
    generateRegion(builder, {
      id: `upperArm_${side}`,
      primaryBone: `arm_${side}`,
      startSeamBone: 'chest',
      endSeamBone: `forearm_${side}`,
      origin: armOrigin,
      axis: upperAxis,
      length: upperLen,
      profile: UPPER_ARM_PROFILE,
      baseRadius: 0.06 * buildK,
      heightSegments: 6,
      radialSegments: 16,
    }, boneIdx, muscleK);

    const forearmAxis = new THREE.Vector3().subVectors(handOrigin, forearmOrigin).normalize();
    const forearmLen = handOrigin.distanceTo(forearmOrigin) * armLen;
    generateRegion(builder, {
      id: `forearm_${side}`,
      primaryBone: `forearm_${side}`,
      startSeamBone: `arm_${side}`,
      endSeamBone: `hand_${side}`,
      origin: forearmOrigin,
      axis: forearmAxis,
      length: forearmLen,
      profile: FOREARM_PROFILE,
      baseRadius: 0.055 * buildK,
      heightSegments: 6,
      radialSegments: 16,
    }, boneIdx, muscleK);

    // Hand stub — closed cap.
    generateRegion(builder, {
      id: `hand_${side}`,
      primaryBone: `hand_${side}`,
      startSeamBone: `forearm_${side}`,
      origin: handOrigin,
      axis: forearmAxis,
      length: 0.12 * buildK,
      profile: HAND_PROFILE,
      baseRadius: 0.045 * buildK,
      heightSegments: 4,
      radialSegments: 12,
      endCap: true,
    }, boneIdx, muscleK);
  }

  // ── Legs (right + left) ──
  for (const side of ['R', 'L'] as const) {
    const legOrigin = boneWorld(`leg_${side}`);
    const lowerLegOrigin = boneWorld(`lowerLeg_${side}`);
    const footOrigin = boneWorld(`foot_${side}`);

    const thighAxis = new THREE.Vector3().subVectors(lowerLegOrigin, legOrigin).normalize();
    const thighLen = lowerLegOrigin.distanceTo(legOrigin) * legLen;
    generateRegion(builder, {
      id: `upperLeg_${side}`,
      primaryBone: `leg_${side}`,
      startSeamBone: 'pelvis',
      endSeamBone: `lowerLeg_${side}`,
      origin: legOrigin,
      axis: thighAxis,
      length: thighLen,
      profile: THIGH_PROFILE,
      baseRadius: 0.075 * buildK * hipW,
      heightSegments: 6,
      radialSegments: 16,
    }, boneIdx, muscleK);

    const shinAxis = new THREE.Vector3().subVectors(footOrigin, lowerLegOrigin).normalize();
    const shinLen = footOrigin.distanceTo(lowerLegOrigin) * legLen;
    generateRegion(builder, {
      id: `lowerLeg_${side}`,
      primaryBone: `lowerLeg_${side}`,
      startSeamBone: `leg_${side}`,
      endSeamBone: `foot_${side}`,
      origin: lowerLegOrigin,
      axis: shinAxis,
      length: shinLen,
      profile: SHIN_PROFILE,
      baseRadius: 0.060 * buildK,
      heightSegments: 6,
      radialSegments: 16,
    }, boneIdx, muscleK);

    // Foot stub — closed cap, oriented forward.
    const footFwd = new THREE.Vector3(0, -0.1, 1).normalize();
    generateRegion(builder, {
      id: `foot_${side}`,
      primaryBone: `foot_${side}`,
      startSeamBone: `lowerLeg_${side}`,
      origin: footOrigin,
      axis: footFwd,
      length: 0.20,
      profile: FOOT_PROFILE,
      baseRadius: 0.06 * buildK,
      heightSegments: 4,
      radialSegments: 12,
      endCap: true,
    }, boneIdx, muscleK);
  }

  // 6. Post-process: chestDepth scale on Z for verts in chest's Y band.
  const chestDepth = params.chestDepth ?? 1.0;
  if (chestDepth !== 1.0) {
    const yMin = chestPos.y - 0.05;
    const yMax = neckPos.y + 0.05;
    for (let i = 0; i < builder.positions.length; i += 3) {
      const y = builder.positions[i + 1];
      if (y >= yMin && y <= yMax) {
        const t = (y - yMin) / (yMax - yMin);
        // Bell-curve ramp so the scale is strongest at chest middle, blends out at top/bottom.
        const ramp = Math.sin(t * Math.PI);
        const k = 1 + (chestDepth - 1) * ramp;
        builder.positions[i + 2] *= k;
      }
    }
  }

  // 7. Apply height scale.
  const height = params.height ?? 1.0;
  if (height !== 1.0) {
    for (let i = 1; i < builder.positions.length; i += 3) {
      builder.positions[i] *= height;
    }
  }

  const geometry = builder.toBufferGeometry();
  return {
    geometry,
    vertexCount: builder.positions.length / 3,
    boneIndexMap: boneIdx,
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
