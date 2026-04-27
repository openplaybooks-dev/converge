// Simple Carnival — uses Quaternius's older simpler-style packs (fish_pack
// + easy_enemies_pack). These models authored their materials in linear
// space at very low values, expecting Unity's tonemapping to brighten them
// — Three.js doesn't, so without recoloring they render as nearly-black
// blobs. The Recolor widget rewrites material colors based on the
// authored material name (LightYellow → vivid yellow, Top → blue, etc).
//
// Per-instance color variation: each animal gets a randomized palette
// override drawn from a per-instance hue, producing visual variety from
// the 13-species set.
//
// Open at /viewer/scene.html?slug=simple-carnival

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  GltfModel, Recolor,
  Sun, AmbientLightWidget, HemisphereLightWidget, Shadows,
  widgetToAssetModule,
} from '@lego';
import { Pine } from '../catalog/nature/tree-pine.js';

const AQUATIC = ['dolphin', 'fish1', 'fish2', 'fish3', 'manta_ray', 'shark', 'whale'];
const CRITTERS = ['frog', 'rat', 'snake', 'snake_angry', 'spider', 'wasp'];

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
}

// Build a randomized palette override for a single instance. Picks a base
// hue and shifts the standard color names within ±60° to keep the model
// internally coherent (e.g., dolphin gets a coordinated blue-ish palette,
// not a clown vomit).
function randomPalette(r: () => number): Record<string, number> {
  const baseHue = r();
  const variants = [-0.08, 0, 0.08, 0.16];
  function hsv(h: number, s: number, v: number): number {
    h = ((h % 1) + 1) % 1;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    let R = 0, G = 0, B = 0;
    switch (i % 6) {
      case 0: R = v; G = t; B = p; break;
      case 1: R = q; G = v; B = p; break;
      case 2: R = p; G = v; B = t; break;
      case 3: R = p; G = q; B = v; break;
      case 4: R = t; G = p; B = v; break;
      case 5: R = v; G = p; B = q; break;
    }
    return (Math.round(R * 255) << 16) | (Math.round(G * 255) << 8) | Math.round(B * 255);
  }
  // Build override using the species' base hue.
  return {
    Top: hsv(baseHue + variants[0], 0.7, 0.85),
    Bottom: hsv(baseHue + 0.5, 0.4, 0.95),                  // belly: opposite hue, pale
    Light: hsv(baseHue + variants[1], 0.6, 0.95),
    Dark: hsv(baseHue + variants[2], 0.8, 0.55),
    LightBrown: hsv(baseHue + 0.05, 0.55, 0.78),
    DarkBrown: hsv(baseHue + 0.05, 0.7, 0.4),
    Brown: hsv(baseHue + 0.05, 0.65, 0.6),
    LightGreen: hsv(0.27 + (r() - 0.5) * 0.1, 0.65, 0.85),
    Green: hsv(0.32 + (r() - 0.5) * 0.1, 0.7, 0.65),
    DarkGreen: hsv(0.34 + (r() - 0.5) * 0.05, 0.75, 0.4),
    LightYellow: hsv(0.13, 0.7, 0.95),
    Yellow: hsv(0.14, 0.85, 0.95),
    Red: hsv(0.0, 0.85, 0.85),
    Orange: hsv(0.07, 0.85, 0.95),
    Purple: hsv(0.78, 0.6, 0.7),
    Pink: hsv(0.94, 0.55, 0.95),
    Black: 0x222222,
    White: 0xfafaf0,
    Gray: 0x808088,
  };
}

class SimpleCarnival extends StatelessWidget3D {
  override build(_ctx: BuildContext): Widget3D {
    const r = rng(2027);
    const sceneChildren: Widget3D[] = [];

    const TREE_RING_R = 90;
    const ANIMAL_R = 70;
    const CRIT_R = 18;
    const N_TREES = 100;
    const N_AERIAL = 220;
    const N_CRIT = 60;
    const SHOW_R = 50;

    // Outer pine ring
    for (let i = 0; i < N_TREES; i++) {
      const a = (i / N_TREES) * Math.PI * 2 + r() * 0.05;
      const radius = TREE_RING_R + (r() - 0.5) * 10;
      sceneChildren.push(new Stack3D({
        at: [Math.cos(a) * radius, 0, Math.sin(a) * radius],
        scale: 1.0 + r() * 0.6,
        children: [new Pine()],
        key: `tree_${i}`,
      }));
    }

    // Aerial fish — each wrapped in Recolor with a randomized palette
    for (let i = 0; i < N_AERIAL; i++) {
      const a = r() * Math.PI * 2;
      const radius = 6 + r() * (ANIMAL_R - 6);
      const y = 4 + r() * 28;
      const species = AQUATIC[Math.floor(r() * AQUATIC.length)];
      sceneChildren.push(new Recolor({
        palette: randomPalette(r),
        child: new Stack3D({
          at: [Math.cos(a) * radius, y, Math.sin(a) * radius],
          rot: [(r() - 0.5) * 0.3, r() * Math.PI * 2, (r() - 0.5) * 0.2],
          scale: 0.6 + r() * 1.4,
          children: [new GltfModel({
            asset: `/assets/quaternius/fish_pack/${species}.glb`,
          })],
        }),
        key: `aerial_${i}`,
      }));
    }

    // Ground critter ring
    for (let i = 0; i < N_CRIT; i++) {
      const a = (i / N_CRIT) * Math.PI * 2 + r() * 0.2;
      const radius = CRIT_R + (r() - 0.5) * 8;
      const species = CRITTERS[Math.floor(r() * CRITTERS.length)];
      sceneChildren.push(new Recolor({
        palette: randomPalette(r),
        child: new Stack3D({
          at: [Math.cos(a) * radius, 0, Math.sin(a) * radius],
          rot: [0, r() * Math.PI * 2, 0],
          scale: 1.2 + r() * 0.6,
          children: [new GltfModel({
            asset: `/assets/quaternius/easy_enemies_pack/${species}.glb`,
            animation: 'Idle',
          })],
        }),
        key: `crit_${i}`,
      }));
    }

    // Showcase ring — one of each species, default palette (still recolored
    // via Recolor's defaults so it's not black).
    const showcase = [...AQUATIC, ...CRITTERS];
    for (let i = 0; i < showcase.length; i++) {
      const a = (i / showcase.length) * Math.PI * 2;
      const isFish = i < AQUATIC.length;
      const subdir = isFish ? 'fish_pack' : 'easy_enemies_pack';
      const y = isFish ? 8 : 0;
      sceneChildren.push(new Recolor({
        child: new Stack3D({
          at: [Math.cos(a) * SHOW_R, y, Math.sin(a) * SHOW_R],
          rot: [0, -a + Math.PI / 2 + Math.PI, 0],
          scale: 2.0,
          children: [new GltfModel({
            asset: `/assets/quaternius/${subdir}/${showcase[i]}.glb`,
            animation: isFish ? undefined : 'Idle',
          })],
        }),
        key: `show_${showcase[i]}`,
      }));
    }

    const lights: Widget3D[] = [
      new Sun({
        tag: 'sun',
        at: [-50, 140, 60],
        color: 0xffffff,
        intensity: 1.6,
        target: [0, 0, 0],
        castShadow: true,
        shadowMapSize: 2048,
        shadowBias: -0.0001,
        shadowCamera: { left: -120, right: 120, top: 120, bottom: -120, near: 1, far: 500 },
      }),
      new AmbientLightWidget({ tag: 'ambient', color: 0xffffff, intensity: 1.0 }),
      new HemisphereLightWidget({ tag: 'hemisphere', skyColor: 0xeae2d8, groundColor: 0x6a7064, intensity: 1.4 }),
    ];

    return new Stack3D({
      name: 'simple-carnival',
      children: [
        ...lights,
        new Shadows({
          cast: true,
          receive: true,
          child: new Stack3D({ name: 'content', children: sceneChildren }),
        }),
      ],
    });
  }
}

export default widgetToAssetModule(
  'simple-carnival',
  {
    kind: 'environment',
    name: 'Simple Carnival',
    description: '13 ultra-low-poly Quaternius silhouettes, recolored by material name (LightYellow → vivid yellow, Top → blue, etc) with per-instance randomized palettes. 220 aerial fish + 60 ground critters + 13-species showcase + 100 pines.',
  },
  new SimpleCarnival(),
);
