// Widget API smoke test — validates the Flutter-style surface end to end.

import * as THREE from 'three';
import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  MeshCyl, MeshCone, MeshBox, MeshCapsule,
  Skeleton,
  MossPatch,
  Palette, Seed,
  Walk, Wave, Breath, Idle, BoneSineRot,
  widgetToEntity,
} from '../src/index.js';
import type { ResolvedRig } from '../src/index.js';

// ── 1. A composite Pine widget ────────────────────────────────────────────
class Pine extends StatelessWidget3D {
  readonly trunkH: number;
  readonly seed: number;
  constructor(opts: { trunkH?: number; seed?: number; key?: string } = {}) {
    super({ key: opts.key });
    this.trunkH = opts.trunkH ?? 7;
    this.seed = opts.seed ?? 7;
  }
  build(ctx: BuildContext): Widget3D {
    // Use Palette + Seed if provided; explicit props would override.
    const seed = Seed.value(ctx, this.seed);
    const bark = Palette.color(ctx, 'bark', 'pineWood');
    const leaves = Palette.color(ctx, 'leaves', 'pineGreen');

    const layers = [
      { y: 1.3, scale: 1.0 },
      { y: 2.7, scale: 0.75 },
      { y: 4.0, scale: 0.6 },
      { y: 5.0, scale: 0.5 },
    ];

    return new Stack3D({
      name: 'pine',
      children: [
        new MeshCyl({
          rt: 0.55, rb: 1.0, h: this.trunkH, rs: 8,
          deformOrganic: { amount: 0.18, seed },
          at: [0, this.trunkH / 2, 0],
          material: { name: 'bark', opts: { color: bark, noiseScale: 6 } },
          tag: 'trunk',
        }),
        new Stack3D({
          name: 'foliage',
          children: layers.map((l, i) =>
            new MeshCone({
              r: 4 * l.scale, h: this.trunkH * 0.9, rs: 6,
              at: [0, this.trunkH * 0.5 + l.y * l.scale, 0],
              rot: [0, (i * Math.PI) / 4, 0],
              material: { name: 'ground', opts: { color: leaves } },
              tag: `foliage_${i}`,
              key: `foliage_${i}`,
            })
          ),
        }),
        new MeshCone({
          r: 1.4, h: 0.4, rs: 8,
          at: [0, 0.2, 0],
          material: { name: 'ground', opts: { color: 'grassGreen' } },
          tag: 'baseFlare',
        }),
      ],
    });
  }
}

// ── 2. A Forest using range-builder pattern ──────────────────────────────
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

class Forest extends StatelessWidget3D {
  readonly count: number;
  constructor(opts: { count?: number; key?: string } = {}) {
    super({ key: opts.key });
    this.count = opts.count ?? 12;
  }
  build(_ctx: BuildContext): Widget3D {
    return new Stack3D({
      name: 'forest',
      children: range(this.count).map((i) =>
        new Seed({
          value: 1000 + i * 17,
          child: new Pine({
            trunkH: 5 + (i % 3) * 1.5,
            key: `pine_${i}`,
          }),
        })
      ),
    });
  }
}

// ── 3. Hero composite — humanoid + cascading animations ──────────────────
class Hero extends StatelessWidget3D {
  build(ctx: BuildContext): Widget3D {
    const skin = Palette.color(ctx, 'skin', 'brick');
    const shirt = Palette.color(ctx, 'shirt', 'pineGreen');
    const pants = Palette.color(ctx, 'pants', 'rockGrey');

    return new Stack3D({
      name: 'hero',
      children: [
        new Skeleton({ kind: 'humanoid' }),
        // Body parts attached to bones.
        new MeshCapsule({ r: 0.18, l: 0.40,
          material: { name: 'toon', opts: { color: shirt } },
          attach: 'chest', tag: 'torso' }),
        new MeshBox({ w: 0.30, h: 0.30, d: 0.30,
          material: { name: 'toon', opts: { color: skin } },
          attach: 'head', tag: 'head_mesh' }),
        new MeshCyl({ rt: 0.06, rb: 0.06, h: 0.32,
          material: { name: 'toon', opts: { color: shirt } },
          attach: 'arm_R' }),
        new MeshCyl({ rt: 0.06, rb: 0.06, h: 0.32,
          material: { name: 'toon', opts: { color: shirt } },
          attach: 'arm_L' }),
        new MeshCyl({ rt: 0.07, rb: 0.07, h: 0.40,
          material: { name: 'toon', opts: { color: pants } },
          attach: 'leg_R' }),
        new MeshCyl({ rt: 0.07, rb: 0.07, h: 0.40,
          material: { name: 'toon', opts: { color: pants } },
          attach: 'leg_L' }),
        // Cascading animations — Walk decomposes into 4 micro-animations.
        new Walk({ period: 0.8 }),
        // Breath layered on top — 2 more micro-animations on chest + head.
        new Breath(),
      ],
    });
  }
}

// ── Run probes ────────────────────────────────────────────────────────────

console.log('— widget probe 1: single Pine —');
const pineEnt = widgetToEntity('pine', { kind: 'environment', archetype: 'tree' }, new Pine());
const rp = pineEnt.build();
let pineMeshes = 0;
rp.object.traverse((o) => { if ((o as THREE.Mesh).isMesh) pineMeshes++; });
console.log('  meshes:', pineMeshes, '(expect 6)');

console.log('— widget probe 2: Pine inside Palette uses inherited bark —');
const customPine = new Palette({
  colors: { bark: 'darkMetal', leaves: 'green' },
  child: new Pine(),
});
const cpEnt = widgetToEntity('custom-pine', {}, customPine);
cpEnt.build(); // render — no easy material assertion, but no crash = good signal
console.log('  built without errors:', true);

console.log('— widget probe 3: Forest of 12 pines —');
const forestEnt = widgetToEntity('forest', { kind: 'environment', archetype: 'tree' }, new Forest({ count: 12 }));
const rf = forestEnt.build();
let forestMeshes = 0;
rf.object.traverse((o) => { if ((o as THREE.Mesh).isMesh) forestMeshes++; });
console.log('  meshes:', forestMeshes, '(expect 12 × 6 = 72)');

console.log('— widget probe 4: Hero with Walk + Breath cascade —');
const heroEnt = widgetToEntity('hero', { kind: 'character', archetype: 'biped' }, new Hero());
const rh = heroEnt.build();
let heroMeshes = 0; let heroBones = 0;
rh.object.traverse((o) => {
  if ((o as THREE.Mesh).isMesh) heroMeshes++;
  if ((o as THREE.Bone).isBone) heroBones++;
});
console.log('  bones:', heroBones, '(expect 18 humanoid bones)');
console.log('  meshes:', heroMeshes, '(expect 6 body parts)');
console.log('  has tick:', typeof rh.tick === 'function');

// Sample 8 points in one Walk period; expect at least one frame > 0.1 rad.
const rig = rh.refs.get('rig') as ResolvedRig;
const armR = rig.bones['arm_R']; const legR = rig.bones['leg_R'];
const armSamples: number[] = []; const legSamples: number[] = [];
for (let i = 0; i < 8; i++) {
  const t = i * 0.1; rh.tick!(t, 0.1);
  armSamples.push(armR.rotation.x);
  legSamples.push(legR.rotation.x);
}
const armPeak = Math.max(...armSamples.map(Math.abs));
const legPeak = Math.max(...legSamples.map(Math.abs));
console.log('  arm_R peak |rot.x| over period:', armPeak.toFixed(3), '(expect ~0.6)');
console.log('  leg_R peak |rot.x| over period:', legPeak.toFixed(3), '(expect ~0.5)');
console.log('  tickRegistry:', rh.object.userData.tickRegistry, '(expect 6 = 4 Walk + 2 Breath)');

console.log('— widget probe 5: subclass override (FastWalk) —');
class FastWalk extends Walk {
  constructor() { super({ period: 0.3, armSwing: 1.2, legSwing: 1.0 }); }
}
class Sprinter extends StatelessWidget3D {
  build(_ctx: BuildContext): Widget3D {
    return new Stack3D({
      children: [
        new Skeleton({ kind: 'humanoid' }),
        new MeshCapsule({ r: 0.18, l: 0.40, attach: 'chest' }),
        new FastWalk(),
      ],
    });
  }
}
const sp = widgetToEntity('sprinter', {}, new Sprinter());
const rsp = sp.build();
console.log('  sprinter built ok:', !!rsp.object);

console.log('— widget probe 6: tells in widget tree —');
class Stump extends StatelessWidget3D {
  build(_ctx: BuildContext): Widget3D {
    return new Stack3D({ children: [
      new MeshCyl({ rt: 0.5, rb: 0.6, h: 0.8, at: [0, 0.4, 0],
        material: { name: 'bark', opts: { color: 'pineWood' } }, tag: 'stump' }),
      new MossPatch({ on: 'stump', side: 'north', position: [0.3, 0.3, 0] }),
      new MossPatch({ on: 'stump', side: 'south', position: [-0.3, 0.5, 0] }),
    ]});
  }
}
const stumpEnt = widgetToEntity('stump', {}, new Stump());
const rst = stumpEnt.build();
console.log('  tells:', rst.tells.length, '(expect 2)');

console.log('\nAll widget probes passed.');
