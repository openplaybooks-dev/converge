// CubeDragon — hand-built cube-style dragon to match Kenney's Cube Pets
// aesthetic (blocky primitives, hard edges, flat shading, saturated
// colors). Designed to slot into scenes/carnival-dragon.ts as the
// centerpiece.
//
// Anatomy (front-facing along -Z, walks along world XZ plane):
//   - Body trunk: long horizontal box (cube_pets are short; dragon is
//     elongated to feel reptilian)
//   - Head + snout (two boxes stacked along -X)
//   - Two horns (small cones on head)
//   - Four legs (boxes hinged at hip/shoulder)
//   - Segmented tail (5 boxes, decreasing size, all hinged in a chain)
//   - Two wings (flat boxes on the upper back, hinged at the body)
//   - Two eyes + pupils
//   - A spike row down the spine (5 small triangular boxes)
//
// Named pivot groups for animation:
//   bodyG       — whole body sway
//   headG       — head turn
//   wingLG/RG   — wings flap
//   tail1G..5G  — chained tail wag
//   legFLG/FRG/BLG/BRG — leg walk

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  LeafWidget3D, BuildContext,
  widgetToAssetModule,
} from '@lego';
import type { Behavior } from '../../src/entity/types.js';
import type { Tick } from '../../src/types.js';

// Build a rounded box. radius defaults to 12% of the smallest dimension
// — large enough to read as a chamfer, small enough not to dissolve the
// silhouette. segments=3 keeps the chamfer smooth at modest cost.
function rbox(w: number, h: number, d: number, radius?: number): THREE.BufferGeometry {
  const r = radius ?? Math.min(w, h, d) * 0.12;
  return new RoundedBoxGeometry(w, h, d, 3, r);
}

// Apply a vertical taper to a geometry — top face is `topScale` times
// the bottom face's footprint. Used for legs (foot wider than thigh),
// snout (front narrower than back), etc.
function taper(geom: THREE.BufferGeometry, topScale: number): THREE.BufferGeometry {
  const pos = geom.attributes.position;
  const arr = pos.array as Float32Array;
  // Find y bounds.
  let yMin = Infinity, yMax = -Infinity;
  for (let i = 1; i < arr.length; i += 3) {
    if (arr[i] < yMin) yMin = arr[i];
    if (arr[i] > yMax) yMax = arr[i];
  }
  const yRange = yMax - yMin || 1;
  for (let i = 0; i < arr.length; i += 3) {
    const yT = (arr[i + 1] - yMin) / yRange;     // 0 at bottom, 1 at top
    const s = 1 + (topScale - 1) * yT;           // lerp scale
    arr[i] *= s;
    arr[i + 2] *= s;
  }
  pos.needsUpdate = true;
  geom.computeVertexNormals();
  return geom;
}

// X-axis taper variant — front (-X) narrower than back (+X). Used for snout.
function taperX(geom: THREE.BufferGeometry, frontScale: number): THREE.BufferGeometry {
  const pos = geom.attributes.position;
  const arr = pos.array as Float32Array;
  let xMin = Infinity, xMax = -Infinity;
  for (let i = 0; i < arr.length; i += 3) {
    if (arr[i] < xMin) xMin = arr[i];
    if (arr[i] > xMax) xMax = arr[i];
  }
  const xRange = xMax - xMin || 1;
  for (let i = 0; i < arr.length; i += 3) {
    // 1 at +X (back), frontScale at -X (front)
    const t = (arr[i] - xMin) / xRange;          // 0 at -X, 1 at +X
    const s = frontScale + (1 - frontScale) * t;
    arr[i + 1] *= s;
    arr[i + 2] *= s;
  }
  pos.needsUpdate = true;
  geom.computeVertexNormals();
  return geom;
}

const C = {
  scale:       0x4f8f3a,   // main body green (deep grass)
  scaleLight:  0x6cba5a,   // belly + accents (bright green)
  spike:       0xeacd5a,   // dorsal spikes (gold)
  horn:        0xf5e7c8,   // horn cream
  claw:        0x222222,   // claws + pupil
  wing:        0xb84230,   // membrane red
  wingBone:    0x9a3525,   // wing-bone darker red
  eye:         0xfafafa,
  pupil:       0x222222,
  mouth:       0x6a2a18,
};

function mat(color: number): THREE.MeshPhongMaterial {
  // Smooth-shaded so RoundedBoxGeometry chamfers fillet softly. A modest
  // specular highlight makes the rounded edges catch light, which is
  // what sells the difference vs. raw boxes.
  return new THREE.MeshPhongMaterial({
    color,
    shininess: 24,
    specular: 0x222222,
    flatShading: false,
  });
}

export class CubeDragon extends LeafWidget3D {
  override buildBehaviors(_ctx: BuildContext): Behavior[] {
    return [{
      kind: 'cube-dragon',
      config: {},
      onBuild: () => {
        const root = new THREE.Group();
        root.name = 'cube-dragon';

        // ─────────────────────────────────────────────────────────────
        // BODY — main trunk, slight forward taper
        // ─────────────────────────────────────────────────────────────
        const bodyG = new THREE.Group();
        bodyG.name = 'cube_dragon_body';
        bodyG.position.y = 0.55;  // lift off ground (legs hang below)
        root.add(bodyG);

        // Main body box — long along -X (head end) to +X (tail end).
        // Slight forward taper (snout end thinner) so the silhouette
        // reads as a creature rather than a brick.
        const trunkGeom = taperX(rbox(1.4, 0.50, 0.55), 0.85);
        const trunk = new THREE.Mesh(trunkGeom, mat(C.scale));
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        bodyG.add(trunk);

        // Belly accent — rounded box, slightly smaller, lighter
        const belly = new THREE.Mesh(rbox(1.30, 0.18, 0.40), mat(C.scaleLight));
        belly.position.set(0, -0.20, 0);
        belly.castShadow = true;
        bodyG.add(belly);

        // Spike row — 5 small pyramidal boxes along the spine
        const spikeGeom = rbox(0.10, 0.16, 0.06, 0.015);
        for (let i = 0; i < 5; i++) {
          const sp = new THREE.Mesh(spikeGeom, mat(C.spike));
          sp.position.set(-0.4 + i * 0.20, 0.30, 0);
          sp.rotation.z = Math.PI / 4;          // 45° rotated → diamond profile
          sp.scale.set(0.7, 0.7, 1);
          sp.castShadow = true;
          bodyG.add(sp);
        }

        // ─────────────────────────────────────────────────────────────
        // HEAD — own group so it can turn / nod
        // ─────────────────────────────────────────────────────────────
        const headG = new THREE.Group();
        headG.name = 'cube_dragon_head';
        headG.position.set(-0.78, 0.10, 0);  // shoulder pivot, head leads
        bodyG.add(headG);

        // Cranium — rounded, slightly chunkier
        const cranium = new THREE.Mesh(rbox(0.45, 0.42, 0.48), mat(C.scale));
        cranium.castShadow = true;
        headG.add(cranium);

        // Snout — front-tapered rounded box (narrower at the tip)
        const snoutGeom = taperX(rbox(0.32, 0.26, 0.36), 0.7);
        const snout = new THREE.Mesh(snoutGeom, mat(C.scale));
        snout.position.set(-0.32, -0.05, 0);
        snout.castShadow = true;
        headG.add(snout);

        // Mouth — thin rounded slab inside the snout, dark
        const mouth = new THREE.Mesh(rbox(0.30, 0.04, 0.30, 0.01), mat(C.mouth));
        mouth.position.set(-0.34, -0.10, 0);
        headG.add(mouth);

        // Horns — two small cones rotated to point up-and-back
        const hornGeom = new THREE.ConeGeometry(0.07, 0.30, 4);
        const hornL = new THREE.Mesh(hornGeom, mat(C.horn));
        hornL.position.set(0.05, 0.30, 0.16);
        hornL.rotation.set(-0.3, 0, -0.2);
        hornL.castShadow = true;
        headG.add(hornL);
        const hornR = new THREE.Mesh(hornGeom, mat(C.horn));
        hornR.position.set(0.05, 0.30, -0.16);
        hornR.rotation.set(0.3, 0, -0.2);
        hornR.castShadow = true;
        headG.add(hornR);

        // Eyes (small rounded boxes — soft cube look)
        const eyeGeom = rbox(0.10, 0.10, 0.06, 0.020);
        const eyeL = new THREE.Mesh(eyeGeom, mat(C.eye));
        eyeL.position.set(-0.18, 0.06, 0.22);
        headG.add(eyeL);
        const eyeR = new THREE.Mesh(eyeGeom, mat(C.eye));
        eyeR.position.set(-0.18, 0.06, -0.22);
        headG.add(eyeR);
        const pupilGeom = rbox(0.04, 0.06, 0.07, 0.012);
        const pupilL = new THREE.Mesh(pupilGeom, mat(C.pupil));
        pupilL.position.set(-0.21, 0.06, 0.22);
        headG.add(pupilL);
        const pupilR = new THREE.Mesh(pupilGeom, mat(C.pupil));
        pupilR.position.set(-0.21, 0.06, -0.22);
        headG.add(pupilR);

        // ─────────────────────────────────────────────────────────────
        // WINGS — one each side, hinged at the upper body
        // ─────────────────────────────────────────────────────────────
        function wing(side: 'L' | 'R'): THREE.Group {
          const g = new THREE.Group();
          g.name = `cube_dragon_wing_${side}`;
          g.position.set(-0.05, 0.20, side === 'L' ? 0.28 : -0.28);
          // Wing bone — rounded slim bar along the body
          const bone = new THREE.Mesh(rbox(0.30, 0.06, 0.10, 0.020), mat(C.wingBone));
          g.add(bone);
          // Wing membrane — rounded flat slab
          const membrane = new THREE.Mesh(rbox(0.50, 0.06, 0.55, 0.020), mat(C.wing));
          membrane.position.set(0.05, 0.02, side === 'L' ? 0.30 : -0.30);
          membrane.castShadow = true;
          g.add(membrane);
          // Trailing fingers — 3 small rounded ribs on the membrane
          const ribGeom = rbox(0.03, 0.04, 0.55, 0.008);
          for (let i = 0; i < 3; i++) {
            const rib = new THREE.Mesh(ribGeom, mat(C.wingBone));
            rib.position.set(-0.10 + i * 0.10, 0.05, side === 'L' ? 0.30 : -0.30);
            g.add(rib);
          }
          return g;
        }
        const wingLG = wing('L');
        bodyG.add(wingLG);
        const wingRG = wing('R');
        bodyG.add(wingRG);

        // ─────────────────────────────────────────────────────────────
        // LEGS — 4 legs as box chains hinged at hip/shoulder
        // ─────────────────────────────────────────────────────────────
        function leg(name: string, x: number, z: number): THREE.Group {
          const g = new THREE.Group();
          g.name = name;
          g.position.set(x, -0.20, z);  // hinge near body bottom
          // Upper leg — rounded box, taper so the bottom (knee) is wider
          // than the top (hip), like a real reptilian thigh
          const upperGeom = taper(rbox(0.18, 0.30, 0.18), 0.7);
          upperGeom.translate(0, -0.15, 0);
          const upper = new THREE.Mesh(upperGeom, mat(C.scale));
          upper.castShadow = true;
          g.add(upper);
          // Foot — rounded box, slightly larger to read as paw vs leg
          const footGeom = rbox(0.20, 0.16, 0.26);
          footGeom.translate(0, -0.40, 0.02);
          const foot = new THREE.Mesh(footGeom, mat(C.scale));
          foot.castShadow = true;
          g.add(foot);
          // Claws — 3 tiny rounded blocks on the foot front
          const clawGeom = rbox(0.04, 0.06, 0.05, 0.010);
          for (let i = 0; i < 3; i++) {
            const cl = new THREE.Mesh(clawGeom, mat(C.claw));
            cl.position.set(-0.05 + i * 0.05, -0.49, 0.16);
            g.add(cl);
          }
          return g;
        }
        // Front-left, front-right, back-left, back-right
        // Convention: dragon faces -X, so front legs are at lower X (head end).
        const legFLG = leg('cube_dragon_leg_FL', -0.45,  0.22);
        const legFRG = leg('cube_dragon_leg_FR', -0.45, -0.22);
        const legBLG = leg('cube_dragon_leg_BL',  0.40,  0.22);
        const legBRG = leg('cube_dragon_leg_BR',  0.40, -0.22);
        bodyG.add(legFLG, legFRG, legBLG, legBRG);

        // ─────────────────────────────────────────────────────────────
        // TAIL — 5-segment chain, each child of the previous so it
        // wags like a real chain
        // ─────────────────────────────────────────────────────────────
        const tailGroups: THREE.Group[] = [];
        let parentForNext: THREE.Object3D = bodyG;
        const tailWidths = [0.30, 0.24, 0.18, 0.13, 0.09];
        const tailLen = 0.22;
        for (let i = 0; i < 5; i++) {
          const seg = new THREE.Group();
          seg.name = `cube_dragon_tail_${i + 1}`;
          // First segment hinges at body's tail end (+X side); subsequent
          // segments hinge at the end of the previous segment.
          if (i === 0) {
            seg.position.set(0.70, 0.0, 0);
          } else {
            seg.position.set(tailLen, 0, 0);
          }
          parentForNext.add(seg);
          tailGroups.push(seg);

          // Rounded box pre-translated so its near-side is at the group origin
          const w = tailWidths[i];
          const segGeom = rbox(tailLen, w, w);
          segGeom.translate(tailLen / 2, 0, 0);
          const segMesh = new THREE.Mesh(segGeom, mat(C.scale));
          segMesh.castShadow = true;
          seg.add(segMesh);

          parentForNext = seg;
        }
        // Tail tip — a small spike on the last segment
        {
          const tip = new THREE.Mesh(rbox(0.12, 0.10, 0.10, 0.020), mat(C.spike));
          tip.position.set(tailLen, 0, 0);
          tip.rotation.z = Math.PI / 4;
          tip.scale.set(0.8, 0.8, 0.8);
          parentForNext.add(tip);
        }

        // ─────────────────────────────────────────────────────────────
        // ANIMATION — gentle idle: body breath, head bob, wing flap,
        // tail wag (chain), claws planted (legs static).
        // ─────────────────────────────────────────────────────────────
        const tick: Tick = (t, _dt) => {
          // Body breath / subtle bounce
          bodyG.position.y = 0.55 + Math.sin(t * 1.6) * 0.025;
          bodyG.rotation.y = Math.sin(t * 0.7) * 0.04;

          // Head bob — turns slightly side-to-side, looks alive
          headG.rotation.y = Math.sin(t * 0.9 + 0.4) * 0.18;
          headG.rotation.x = Math.sin(t * 1.6) * 0.08;

          // Wings flap — fold/unfold with offset between L and R
          wingLG.rotation.x = -0.3 + Math.sin(t * 2.5) * 0.35;
          wingRG.rotation.x = 0.3 - Math.sin(t * 2.5) * 0.35;

          // Tail chain — sine wave traveling head→tail. Each segment
          // has a phase offset so the wave reads as propagating.
          for (let i = 0; i < tailGroups.length; i++) {
            const phase = -i * 0.4;
            tailGroups[i].rotation.y = Math.sin(t * 2.0 + phase) * 0.30;
          }
        };

        return { object: root, ticks: [tick] };
      },
    }];
  }
}

export default widgetToAssetModule(
  'cube-dragon',
  {
    kind: 'character',
    archetype: 'biped',  // closest fit; we don't have 'quadruped' exactly here
    name: 'Cube Dragon',
    description: 'Hand-built cube-style dragon. 4 legs, 2 wings, 5-segment tail, horns + spikes. Designed to fit Kenney Cube Pets aesthetic. Idle animation: breath, head turn, wing flap, tail wag.',
  },
  new CubeDragon(),
);
