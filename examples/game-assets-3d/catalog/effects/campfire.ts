// Campfire — ported from interactive-low-poly-environment's `Campfire`
// (Roberto Nacu, MIT). Stone ring + log spokes + animated flame.
//
// Original: js/main.js:5385.
//   - Stones: 40 separate Stone instances arranged in a circle. We collapse
//     this into a torus + a few accent stones for performance and simplicity
//     — same silhouette at scene scale.
//   - Logs: 10 deformed cylinder spokes pointing at the center.
//   - Flame: a THREE.Points cloud of 50 particles using a custom GLSL shader
//     (FIRE_VS/FIRE_FS). We use our 'fire' ShaderMaterial on a billboard plane
//     plus a ShaderTime tick to advance the uTime uniform.

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  MeshTorus, MeshCyl, MeshIcosa,
  Palette,
  FireParticles,
  PointLightWidget,
  widgetToAssetModule,
} from '@lego';

let CAMPFIRE_INSTANCE_ID = 0;

const STONE_RADIUS = 12;
const LOG_RADIUS = 5;
const N_LOGS = 10;
const N_ACCENT_STONES = 8;

export class Campfire extends StatelessWidget3D {
  private readonly instanceId: number;
  constructor(opts: { key?: string } = {}) {
    super(opts);
    this.instanceId = CAMPFIRE_INSTANCE_ID++;
  }
  override build(ctx: BuildContext): Widget3D {
    const stoneColor = Palette.color(ctx, 'rock', 'rockGrey');
    const wood = Palette.color(ctx, 'wood', 'pineWood');
    // Note: flame color is hard-coded in the GLSL FIRE_FS via per-vertex `colour`
    // attributes (red base → orange → yellow), so we don't read a Palette color here.

    return new Stack3D({
      name: 'campfire',
      children: [
        // Stone ring — a flat torus reads as a circle of stones at distance.
        new MeshTorus({
          r: STONE_RADIUS, tr: 1, rs: 6, ts: 24,
          at: [0, 0.5, 0],
          rot: [Math.PI / 2, 0, 0],
          material: { name: 'ground', opts: { color: stoneColor, flatShading: true } },
          tag: 'stone_ring',
        }),
        // Accent boulders to give the ring volume.
        new Stack3D({
          name: 'accent_stones',
          children: Array.from({ length: N_ACCENT_STONES }, (_, i) => {
            const angle = (i / N_ACCENT_STONES) * Math.PI * 2;
            return new MeshIcosa({
              r: 1.2, d: 0,
              deformBox: { amount: 0.3, seed: 31 + i },
              deformFlat: true,
              at: [Math.cos(angle) * STONE_RADIUS, 1.0, Math.sin(angle) * STONE_RADIUS],
              rot: [0, i * 0.7, 0],
              material: { name: 'ground', opts: { color: stoneColor } },
              tag: `accent_${i}`,
              key: `accent_${i}`,
            });
          }),
        }),
        // Log spokes — radial logs leaning toward the center.
        new Stack3D({
          name: 'logs',
          children: Array.from({ length: N_LOGS }, (_, i) => {
            const angle = (i / N_LOGS) * Math.PI * 2;
            return new MeshCyl({
              rt: 0.55, rb: 0.55, h: 5, rs: 8,
              deformOrganic: { amount: 0.12, seed: 51 + i },
              at: [Math.cos(angle) * LOG_RADIUS * 0.5, 0.6, Math.sin(angle) * LOG_RADIUS * 0.5],
              // Tilt logs toward the centre on the X axis (Z rotation = sweeping the log "around" so its long axis points inward).
              rot: [0, angle + Math.PI / 2, Math.PI / 3],
              material: { name: 'bark', opts: { color: wood, noiseScale: 6 } },
              tag: `log_${i}`,
              key: `log_${i}`,
            });
          }),
        }),
        // Flame particles — upstream's GLSL FIRE_VS/FS shader with 50 points,
        // per-vertex aScale + colour, advanced by uTime each frame.
        new Stack3D({
          at: [0, 0, 0],
          children: [new FireParticles({
            count: 50,
            spread: [3, 8, 3],
            size: 80,
          })],
        }),
        // PointLight illuminates surroundings at night. Tagged for nightLights.
        new PointLightWidget({
          at: [0, 4, 0],
          color: 'fireDarkYellow',
          intensity: 2.5,
          distance: 18,
          decay: 2,
          visible: false,
          tag: `campfire_light_${this.instanceId}`,
        }),
      ],
    });
  }
}

export default widgetToAssetModule(
  'campfire',
  {
    kind: 'effect',
    archetype: 'effect',
    name: 'Campfire',
    description: 'Stone fire ring with log spokes and animated billboard flames using the custom fire shader.',
  },
  new Campfire(),
);
