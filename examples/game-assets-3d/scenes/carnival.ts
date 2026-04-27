// Carnival — large festival with all 24 Kenney Cube Pets in many copies,
// each playing one of 8 built-in animations (idle/walk/run/eat/dance/etc).
// Animals are spaced via rejection sampling so they don't overlap.

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  GltfModel, World,
  widgetToAssetModule,
} from '@lego';

const ANIMALS = [
  'beaver', 'bee', 'bunny', 'cat', 'caterpillar', 'chick', 'cow', 'crab',
  'deer', 'dog', 'elephant', 'fish', 'fox', 'giraffe', 'hog', 'koala',
  'lion', 'monkey', 'panda', 'parrot', 'penguin', 'pig', 'polar', 'tiger',
];

// Weighted animation pool — heavier weight on idle/walk/dance so the crowd
// looks lively but not chaotic.
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
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function pickAnim(r: () => number): string {
  let pick = r() * ANIM_TOTAL;
  for (const a of ANIM_POOL) {
    pick -= a.weight;
    if (pick <= 0) return a.name;
  }
  return 'idle';
}

class Carnival extends StatelessWidget3D {
  override build(_ctx: BuildContext): Widget3D {
    const r = rng(73);
    const children: Widget3D[] = [];

    // ── Layout dimensions ───────────────────────────────────────────────
    const RING_R = 50;          // outer banner ring radius (was 18)
    const BOOTH_R = 38;         // booth ring radius (was 14)
    const PARADE_R = 28;        // parade ring radius (was 11)
    const CENTER_KEEPOUT = 4;   // skip animals inside this radius
    const ANIMAL_MIN_DIST = 2.0; // min spacing between animals

    // ── Outer banner ring (larger circumference → more banners) ─────────
    const N_BANNERS = 120;
    for (let i = 0; i < N_BANNERS; i++) {
      const a = (i / N_BANNERS) * Math.PI * 2;
      const x = Math.cos(a) * RING_R;
      const z = Math.sin(a) * RING_R;
      children.push(new Stack3D({
        at: [x, 0, z],
        rot: [0, -a + Math.PI / 2, 0],
        children: [new GltfModel({ asset: '/assets/kenney/mini-dungeon/banner.glb' })],
        key: `banner_${i}`,
      }));
    }

    // ── 16 booths (gate + 2 columns each) around the booth ring ─────────
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

    // ── Centerpiece: prize wheel + flanking arcade machines ──────────────
    children.push(new Stack3D({
      at: [0, 0, 0],
      children: [new GltfModel({ asset: '/assets/kenney/mini-arcade/prize-wheel.glb' })],
      key: 'prize_wheel',
    }));
    children.push(new Stack3D({
      at: [-3, 0, 0],
      rot: [0, Math.PI / 2, 0],
      children: [new GltfModel({ asset: '/assets/kenney/mini-arcade/claw-machine.glb' })],
      key: 'claw_machine',
    }));
    children.push(new Stack3D({
      at: [3, 0, 0],
      rot: [0, -Math.PI / 2, 0],
      children: [new GltfModel({ asset: '/assets/kenney/mini-arcade/dance-machine.glb' })],
      key: 'dance_machine',
    }));

    // ── Animal crowd: rejection-sampled placement ───────────────────────
    // Sample uniformly inside the booth ring; reject candidates closer than
    // ANIMAL_MIN_DIST to any prior animal or to the center keepout.
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

    // ── Parade: 2 concentric rings, one of each species per ring ────────
    // Inner ring: facing center, walking. Outer ring: idle.
    for (let i = 0; i < ANIMALS.length; i++) {
      const a = (i / ANIMALS.length) * Math.PI * 2;
      const x = Math.cos(a) * PARADE_R;
      const z = Math.sin(a) * PARADE_R;
      children.push(new Stack3D({
        at: [x, 0, z],
        rot: [0, -a + Math.PI / 2 + Math.PI, 0],
        children: [new GltfModel({
          asset: `/assets/kenney/cube-pets/animal-${ANIMALS[i]}.glb`,
          animation: 'walk',
        })],
        key: `parade_inner_${ANIMALS[i]}`,
      }));
    }
    const PARADE_R2 = 44;
    for (let i = 0; i < ANIMALS.length; i++) {
      const a = ((i + 0.5) / ANIMALS.length) * Math.PI * 2; // staggered
      const x = Math.cos(a) * PARADE_R2;
      const z = Math.sin(a) * PARADE_R2;
      children.push(new Stack3D({
        at: [x, 0, z],
        rot: [0, -a + Math.PI / 2, 0], // facing outward
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
      child: new Stack3D({ name: 'carnival', children }),
    });
  }
}

export default widgetToAssetModule(
  'carnival',
  {
    kind: 'environment',
    name: 'Carnival of Animals',
    description: '~250 spaced animals (24 species) animating + 48-animal parade rings, around 16 booths and a 120-banner outer ring (radius 50). Cube-pet style.',
  },
  new Carnival(),
);
