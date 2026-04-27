// Quaternius Carnival — true faceted polygon style. Custom-lit (bright,
// no fog) so the entire 240-unit-diameter scene is fully visible. Built
// without `World` because World defaults dim the scene and add fog at 80u.
//
// Open at /viewer/scene.html?slug=quaternius-carnival

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  GltfModel, Recolor,
  Sun, AmbientLightWidget, HemisphereLightWidget,
  Shadows,
  widgetToAssetModule,
} from '@lego';
import { Pine } from '../catalog/nature/tree-pine.js';

const LAND_ANIMALS = [
  'alpaca', 'bull', 'cow', 'deer', 'donkey', 'fox',
  'horse', 'horse_white', 'husky', 'shibainu', 'stag', 'wolf',
];
const DINOS = [
  'apatosaurus', 'parasaurolophus', 'stegosaurus', 'trex', 'triceratops', 'velociraptor',
];
const CRITTERS = [
  'frog', 'rat', 'snake', 'snake_angry', 'spider', 'wasp',
];
const FISH = [
  'anglerfish', 'armoredcatfish', 'betta', 'blacklionfish', 'blobfish',
  'bluegoldfish', 'bluetang', 'butterflyfish', 'cardinalfish', 'clownfish',
  'coralgrouper', 'cowfish', 'flatfish', 'flowerhorn', 'goblinshark',
  'goldfish', 'humphead', 'koi', 'lionfish', 'mandarinfish', 'moorishidol',
  'parrotfish', 'piranha', 'puffer', 'redsnapper', 'royalgramma', 'shark',
  'sunfish', 'swordfish', 'tang', 'tetra', 'tuna', 'turbot',
];

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
}

class QuaterniusCarnival extends StatelessWidget3D {
  override build(_ctx: BuildContext): Widget3D {
    const r = rng(2026);

    // ── Layout dimensions (≈3× the previous carnival) ───────────────────
    const TREE_RING_R = 110;     // outer pine ring (was 60)
    const ANIMAL_R = 95;         // animal placement radius (was 45)
    const SHOW_R = 65;           // species-showcase ring (was 32)
    const DINO_R = 28;           // dino parade radius (was 14)
    const CRIT_R = 16;           // critter ring radius (was 8)
    const N_TREES = 160;         // more trees for the bigger ring (was 80)
    const N_LAND = 320;          // more land animals (was 140)
    const N_CRIT = 50;           // more critters (was 30)
    const N_FISH = 180;          // more sky fish (was 80)

    const sceneChildren: Widget3D[] = [];

    // ── Outer pine forest ring ──────────────────────────────────────────
    for (let i = 0; i < N_TREES; i++) {
      const a = (i / N_TREES) * Math.PI * 2 + r() * 0.05;
      const radius = TREE_RING_R + (r() - 0.5) * 12;
      const x = Math.cos(a) * radius;
      const z = Math.sin(a) * radius;
      sceneChildren.push(new Stack3D({
        at: [x, 0, z],
        scale: 1.2 + r() * 0.8,
        children: [new Pine()],
        key: `tree_${i}`,
      }));
    }

    // ── Land-animal crowd (rejection-sampled spacing) ───────────────────
    const placements: { x: number; z: number; w: number }[] = [];
    let attempts = 0;
    while (placements.length < N_LAND && attempts < N_LAND * 30) {
      attempts++;
      const radius = Math.sqrt(r()) * (ANIMAL_R - 4);
      const angle = r() * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      // Keep center clear for the dino parade (radius 28 → keepout 12)
      if (x * x + z * z < 12 * 12) continue;
      let ok = true;
      for (const p of placements) {
        const dx = p.x - x, dz = p.z - z;
        if (dx * dx + dz * dz < (p.w + 3.0) * (p.w + 3.0)) { ok = false; break; }
      }
      if (!ok) continue;
      placements.push({ x, z, w: 2.0 });
    }
    const LAND_CLIPS = ['Idle', 'Idle_2', 'Eating', 'Gallop', 'Walk'];
    for (let i = 0; i < placements.length; i++) {
      const { x, z } = placements[i];
      const species = LAND_ANIMALS[Math.floor(r() * LAND_ANIMALS.length)];
      sceneChildren.push(new Stack3D({
        at: [x, 0, z],
        rot: [0, r() * Math.PI * 2, 0],
        scale: 1.0 + r() * 0.5,
        children: [new GltfModel({
          asset: `/assets/quaternius/animals_pack/${species}.glb`,
          animation: LAND_CLIPS[Math.floor(r() * LAND_CLIPS.length)],
        })],
        key: `land_${i}`,
      }));
    }

    // ── Dino parade ─────────────────────────────────────────────────────
    const DINO_CLIPS = ['Idle', 'Walk'];
    for (let i = 0; i < DINOS.length; i++) {
      const a = (i / DINOS.length) * Math.PI * 2;
      sceneChildren.push(new Stack3D({
        at: [Math.cos(a) * DINO_R, 0, Math.sin(a) * DINO_R],
        rot: [0, -a + Math.PI / 2 + Math.PI, 0],
        scale: 1.2,
        children: [new GltfModel({
          asset: `/assets/quaternius/dinosaurs_pack/${DINOS[i]}.glb`,
          animation: DINO_CLIPS[i % DINO_CLIPS.length],
        })],
        key: `dino_${DINOS[i]}`,
      }));
    }

    // ── Critter ring ────────────────────────────────────────────────────
    for (let i = 0; i < N_CRIT; i++) {
      const a = (i / N_CRIT) * Math.PI * 2 + r() * 0.2;
      const radius = CRIT_R + (r() - 0.5) * 6;
      const species = CRITTERS[Math.floor(r() * CRITTERS.length)];
      sceneChildren.push(new Stack3D({
        at: [Math.cos(a) * radius, 0, Math.sin(a) * radius],
        rot: [0, r() * Math.PI * 2, 0],
        scale: 1.4 + r() * 0.6,
        children: [new GltfModel({
          asset: `/assets/quaternius/easy_enemies_pack/${species}.glb`,
          animation: 'Idle',
        })],
        key: `crit_${i}`,
      }));
    }

    // ── Aerial fish parade — floating overhead ──────────────────────────
    for (let i = 0; i < N_FISH; i++) {
      const a = r() * Math.PI * 2;
      const radius = 8 + r() * 70;
      const y = 6 + r() * 18;
      const species = FISH[Math.floor(r() * FISH.length)];
      sceneChildren.push(new Stack3D({
        at: [Math.cos(a) * radius, y, Math.sin(a) * radius],
        rot: [(r() - 0.5) * 0.4, r() * Math.PI * 2, (r() - 0.5) * 0.3],
        scale: 0.6 + r() * 0.8,
        children: [new GltfModel({
          asset: `/assets/quaternius/cute_fish_pack/${species}.glb`,
          animation: 'Idle',
        })],
        key: `fish_${i}`,
      }));
    }

    // ── Showcase ring (one of each land species) ────────────────────────
    for (let i = 0; i < LAND_ANIMALS.length; i++) {
      const a = (i / LAND_ANIMALS.length) * Math.PI * 2;
      sceneChildren.push(new Stack3D({
        at: [Math.cos(a) * SHOW_R, 0, Math.sin(a) * SHOW_R],
        rot: [0, -a + Math.PI / 2 + Math.PI, 0],
        scale: 1.5,
        children: [new GltfModel({
          asset: `/assets/quaternius/animals_pack/${LAND_ANIMALS[i]}.glb`,
          animation: 'Idle',
        })],
        key: `show_${LAND_ANIMALS[i]}`,
      }));
    }

    // ── Hand-rolled lighting (bright, no fog, big shadow camera) ────────
    // Defaults from World are tuned for ≤80u scenes and look dim/foggy here.
    const lights: Widget3D[] = [
      new Sun({
        tag: 'sun',
        at: [-50, 140, 60],
        color: 0xffffff,
        intensity: 1.6,                    // was 0.55 from World midday
        target: [0, 0, 0],
        castShadow: true,
        shadowMapSize: 2048,
        shadowBias: -0.0001,
        shadowCamera: { left: -150, right: 150, top: 150, bottom: -150, near: 1, far: 600 },
      }),
      new AmbientLightWidget({
        tag: 'ambient',
        color: 0xffffff,
        intensity: 1.0,                    // was 0.3
      }),
      new HemisphereLightWidget({
        tag: 'hemisphere',
        skyColor: 0xeae2d8,
        groundColor: 0x6a7064,
        intensity: 1.4,                    // was 0.65
      }),
    ];

    // Shadows wrapper so descendant meshes inherit cast/receive defaults
    // (matches what World does internally).
    return new Stack3D({
      name: 'quaternius-carnival',
      children: [
        ...lights,
        new Shadows({
          cast: true,
          receive: true,
          child: new Recolor({
            // Quaternius materials are stored in linear space at very low
            // values (LightBrown = rgb 31/25/16) — three.js renders that
            // as nearly black. Recolor maps the authored material names
            // ('LightBrown', 'Green', 'Top', 'Bottom', etc) to vivid hex
            // colors so the animals show their intended species colors.
            child: new Stack3D({ name: 'content', children: sceneChildren }),
          }),
        }),
      ],
    });
  }
}

export default widgetToAssetModule(
  'quaternius-carnival',
  {
    kind: 'environment',
    name: 'Quaternius Carnival',
    description: '~580 faceted-polygon entities: 320 land animals + 50 critters + 6-dino parade + 180 sky fish + 12-species showcase + 160 pine outer ring. Bright lighting, no fog, 220-unit diameter.',
  },
  new QuaterniusCarnival(),
);
