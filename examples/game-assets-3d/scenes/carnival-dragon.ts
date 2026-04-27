// Carnival of Dragons — clone of scenes/carnival.ts with the cube-style
// hand-built CubeDragon as the star (centerpiece + 6-dragon honor guard
// at the parade ring), surrounded by the existing 24 Kenney Cube Pets in
// the supporting crowd.
//
// Open at /viewer/scene.html?slug=carnival-dragon

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  GltfModel, World,
  widgetToAssetModule,
} from '@lego';
import { CubeDragon } from '../catalog/showcase/cube-dragon.js';

const ANIMALS = [
  'beaver', 'bee', 'bunny', 'cat', 'caterpillar', 'chick', 'cow', 'crab',
  'deer', 'dog', 'elephant', 'fish', 'fox', 'giraffe', 'hog', 'koala',
  'lion', 'monkey', 'panda', 'parrot', 'penguin', 'pig', 'polar', 'tiger',
];

const ANIM_POOL: { name: string; weight: number }[] = [
  { name: 'idle', weight: 5 },
  { name: 'walk', weight: 3 },
  { name: 'dance', weight: 3 },
  { name: 'run', weight: 2 },
  { name: 'eat', weight: 2 },
  { name: 'gesture-positive', weight: 1 },
  { name: 'gesture-negative', weight: 1 },
];
const ANIM_TOTAL = ANIM_POOL.reduce((s, a) => s + a.weight, 0);

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
}
function pickAnim(r: () => number): string {
  let pick = r() * ANIM_TOTAL;
  for (const a of ANIM_POOL) { pick -= a.weight; if (pick <= 0) return a.name; }
  return 'idle';
}

class DragonCarnival extends StatelessWidget3D {
  override build(_ctx: BuildContext): Widget3D {
    const r = rng(42);
    const children: Widget3D[] = [];

    const RING_R = 50;
    const BOOTH_R = 38;
    const PARADE_R = 28;
    const CENTER_KEEPOUT = 6;     // bigger than before (giant dragon at center)
    const ANIMAL_MIN_DIST = 2.0;

    // ── Banner ring ──────────────────────────────────────────────────────
    const N_BANNERS = 120;
    for (let i = 0; i < N_BANNERS; i++) {
      const a = (i / N_BANNERS) * Math.PI * 2;
      children.push(new Stack3D({
        at: [Math.cos(a) * RING_R, 0, Math.sin(a) * RING_R],
        rot: [0, -a + Math.PI / 2, 0],
        children: [new GltfModel({ asset: '/assets/kenney/mini-dungeon/banner.glb' })],
        key: `banner_${i}`,
      }));
    }

    // ── Booth ring (gates + columns) ─────────────────────────────────────
    const N_BOOTHS = 16;
    for (let i = 0; i < N_BOOTHS; i++) {
      const a = (i / N_BOOTHS) * Math.PI * 2;
      const x = Math.cos(a) * BOOTH_R;
      const z = Math.sin(a) * BOOTH_R;
      const rotY = -a + Math.PI / 2;
      children.push(new Stack3D({
        at: [x, 0, z],
        rot: [0, rotY, 0],
        children: [new GltfModel({ asset: '/assets/kenney/mini-dungeon/gate.glb' })],
        key: `gate_${i}`,
      }));
      const px = Math.cos(a + Math.PI / 2) * 1.2;
      const pz = Math.sin(a + Math.PI / 2) * 1.2;
      children.push(new Stack3D({
        at: [x + px, 0, z + pz],
        children: [new GltfModel({ asset: '/assets/kenney/mini-dungeon/column.glb' })],
        key: `col_a_${i}`,
      }));
      children.push(new Stack3D({
        at: [x - px, 0, z - pz],
        children: [new GltfModel({ asset: '/assets/kenney/mini-dungeon/column.glb' })],
        key: `col_b_${i}`,
      }));
    }

    // ── CENTERPIECE: giant Cube Dragon (the star) ────────────────────────
    children.push(new Stack3D({
      at: [0, 0, 0],
      scale: 3.5,                    // 3.5× normal — towering over the carnival
      children: [new CubeDragon()],
      key: 'dragon_star',
    }));

    // ── Animal crowd: rejection-sampled placement (24 cube pets) ─────────
    const placements: { x: number; z: number }[] = [];
    const N_ANIMALS = 250;
    let attempts = 0;
    const ATTEMPT_BUDGET = N_ANIMALS * 30;
    while (placements.length < N_ANIMALS && attempts < ATTEMPT_BUDGET) {
      attempts++;
      const radius = Math.sqrt(r()) * (BOOTH_R - 2);
      const angle = r() * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      if (x * x + z * z < CENTER_KEEPOUT * CENTER_KEEPOUT) continue;
      let ok = true;
      for (const p of placements) {
        const dx = p.x - x, dz = p.z - z;
        if (dx * dx + dz * dz < ANIMAL_MIN_DIST * ANIMAL_MIN_DIST) { ok = false; break; }
      }
      if (!ok) continue;
      placements.push({ x, z });
    }
    for (let i = 0; i < placements.length; i++) {
      const { x, z } = placements[i];
      const species = ANIMALS[Math.floor(r() * ANIMALS.length)];
      const scale = 0.85 + r() * 0.5;
      const yaw = r() * Math.PI * 2;
      const animation = pickAnim(r);
      children.push(new Stack3D({
        at: [x, 0, z],
        rot: [0, yaw, 0],
        scale,
        children: [new GltfModel({
          asset: `/assets/kenney/cube-pets/animal-${species}.glb`,
          animation,
        })],
        key: `animal_${i}`,
      }));
    }

    // ── Dragon honor guard: 6 dragons at parade ring, facing inward ──────
    const N_HONOR = 6;
    for (let i = 0; i < N_HONOR; i++) {
      const a = (i / N_HONOR) * Math.PI * 2;
      const x = Math.cos(a) * PARADE_R;
      const z = Math.sin(a) * PARADE_R;
      children.push(new Stack3D({
        at: [x, 0, z],
        rot: [0, -a, 0],            // dragon's -X (head) points to center
        scale: 1.4,
        children: [new CubeDragon()],
        key: `dragon_honor_${i}`,
      }));
    }

    // ── Cube-pets parade: original 24 species at outer parade ring ──────
    const PARADE_R2 = 44;
    for (let i = 0; i < ANIMALS.length; i++) {
      const a = ((i + 0.5) / ANIMALS.length) * Math.PI * 2;
      const x = Math.cos(a) * PARADE_R2;
      const z = Math.sin(a) * PARADE_R2;
      children.push(new Stack3D({
        at: [x, 0, z],
        rot: [0, -a + Math.PI / 2, 0],
        children: [new GltfModel({
          asset: `/assets/kenney/cube-pets/animal-${ANIMALS[i]}.glb`,
          animation: 'idle',
        })],
        key: `parade_outer_${ANIMALS[i]}`,
      }));
    }

    return new World({
      daynight: { staticPhase: 'midday' },
      sunShadow: { left: -80, right: 80, top: 80, bottom: -80, near: 1, far: 300 },
      child: new Stack3D({ name: 'carnival-dragon', children }),
    });
  }
}

export default widgetToAssetModule(
  'carnival-dragon',
  {
    kind: 'environment',
    name: 'Carnival of Dragons',
    description: 'Cube-Pets carnival with a hand-built cube-style dragon as centerpiece (3.5× scale) plus a 6-dragon honor guard at the parade ring. 250 cube-pet supporting cast around the perimeter, 16 booths, 120-banner ring.',
  },
  new DragonCarnival(),
);
