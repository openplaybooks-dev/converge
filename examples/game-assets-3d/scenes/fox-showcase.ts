// Fox Showcase — four foxes side by side to compare AI-generated vs.
// production-rigged assets:
//
//   POS 1 (-7.5):  Meshy AI fox — 271k tris, no rig, static.
//                  Original Meshy text-to-3D output.
//   POS 2 (-2.5):  Meshy AI fox — same 271k mesh + 27-bone rig, but
//                  cycling SIX synthesized states (Idle, Walk, Run,
//                  Pant, Sit, Sleep) built atop the single baked walk
//                  cycle via timeScale, action-weight, and procedural
//                  per-bone overlays. Demonstrates how to multiply a
//                  single AI-generated clip into a state machine.
//   POS 3 (+2.5):  Quaternius fox — 2k tris, rigged, continuous Idle.
//                  Production-ready.
//   POS 4 (+7.5):  Quaternius fox — same model, cycling through ALL
//                  12 animations (Idle, Walk, Gallop, Eating, Attack,
//                  Death, Jump, etc) every 3.5s with a smooth crossfade.
//                  Demonstrates the full rig in motion.
//
// Takeaway: AI-generated rigs (POS 2) deliver "one walk cycle that
// works" but the polygon and animation counts make them poor crowd
// fodder. Quaternius-style hand-rigged assets (POS 3 & 4) are 100×
// lighter and ship with 12× more animations. Pick by use case.
//
// Open at /viewer/scene.html?slug=fox-showcase

import {
  StatelessWidget3D, Stack3D, BuildContext, Widget3D,
  GltfModel, GltfModelCycle, GltfModelMultiState,
  Sun, AmbientLightWidget, HemisphereLightWidget, Shadows,
  widgetToAssetModule,
} from '@lego';
import type { AnimState } from '@lego';

// Six synthesized states for the Meshy fox. Built on top of the single
// 'baselayer' walk clip Meshy generated. Each state is a (timeScale,
// weight, overlays, rootPose) triple — no real new clips, but the
// combination reads as different behaviors.
const MESHY_FOX_STATES: AnimState[] = [
  // IDLE — base walk slowed to a near-freeze, head bobs, tail twitches.
  {
    name: 'Idle',
    timeScale: 0.15,
    weight: 0.4,
    overlays: [
      { bone: 'head', prop: 'rotation', axis: 'y', amplitude: 0.10, freq: 0.4, phase: 0 },
      { bone: 'head', prop: 'rotation', axis: 'x', amplitude: 0.04, freq: 0.6, phase: 0.5 },
      { bone: 'tail2', prop: 'rotation', axis: 'y', amplitude: 0.18, freq: 0.7 },
      { bone: 'tail3', prop: 'rotation', axis: 'y', amplitude: 0.25, freq: 0.7, phase: 0.4 },
    ],
    // No rootPose offset — the rigged fox's feet are already at y=0
  },
  // WALK — base clip at authored speed, full weight, plus a gentle tail wag.
  {
    name: 'Walk',
    timeScale: 1.0,
    weight: 1.0,
    overlays: [
      { bone: 'tail2', prop: 'rotation', axis: 'y', amplitude: 0.12, freq: 1.5 },
      { bone: 'tail3', prop: 'rotation', axis: 'y', amplitude: 0.18, freq: 1.5, phase: 0.5 },
    ],
  },
  // RUN — same base clip, but 2.4× faster and head pitches forward via overlay.
  {
    name: 'Run',
    timeScale: 2.4,
    weight: 1.0,
    overlays: [
      { bone: 'head', prop: 'rotation', axis: 'x', amplitude: 0.0, freq: 0 },
      { bone: 'tail3', prop: 'rotation', axis: 'y', amplitude: 0.30, freq: 3.0 },
    ],
    rootPose: { rotationX: -0.08 },  // lean forward
  },
  // PANT — frozen base, head bobs fast (panting), tail still
  {
    name: 'Pant',
    timeScale: 0,
    weight: 0,
    overlays: [
      { bone: 'head', prop: 'rotation', axis: 'x', amplitude: 0.18, freq: 3.0 },
      { bone: 'head', prop: 'position', axis: 'y', amplitude: 0.005, freq: 3.0 },
      { bone: 'tail2', prop: 'rotation', axis: 'y', amplitude: 0.10, freq: 1.0 },
    ],
  },
  // SIT — legs frozen, body tilted back, head looks up curiously.
  {
    name: 'Sit',
    timeScale: 0,
    weight: 0,
    overlays: [
      { bone: 'head', prop: 'rotation', axis: 'y', amplitude: 0.15, freq: 0.5 },
      { bone: 'tail2', prop: 'rotation', axis: 'y', amplitude: 0.10, freq: 0.6 },
    ],
    // Tilt back, but don't lower (would bury legs)
    rootPose: { rotationX: 0.20 },
  },
  // SLEEP — fully zeroed, body breathing via Hips Y-position.
  {
    name: 'Sleep',
    timeScale: 0,
    weight: 0,
    overlays: [
      { bone: 'Hips', prop: 'position', axis: 'y', amplitude: 0.012, freq: 0.4 },
      { bone: 'chest', prop: 'rotation', axis: 'x', amplitude: 0.02, freq: 0.4, phase: 1.5 },
    ],
    // Roll to one side; no lowering
    rootPose: { rotationZ: 0.15 },
  },
];

class FoxShowcase extends StatelessWidget3D {
  override build(_ctx: BuildContext): Widget3D {
    return new Stack3D({
      name: 'fox-showcase',
      children: [
        // Lighting (no fog, bright — same defaults as the other carnivals)
        new Sun({
          tag: 'sun',
          at: [-30, 80, 40],
          color: 0xffffff,
          intensity: 1.6,
          target: [0, 0, 0],
          castShadow: true,
          shadowMapSize: 2048,
          shadowBias: -0.0001,
          shadowCamera: { left: -30, right: 30, top: 20, bottom: -20, near: 1, far: 200 },
        }),
        new AmbientLightWidget({ tag: 'ambient', color: 0xffffff, intensity: 1.0 }),
        new HemisphereLightWidget({
          tag: 'hemisphere',
          skyColor: 0xeae2d8,
          groundColor: 0x6a7064,
          intensity: 1.4,
        }),

        new Shadows({
          cast: true,
          receive: true,
          child: new Stack3D({
            name: 'foxes',
            children: [
              // POS 1: Meshy static (no rig, 271k tris).
              // The static GLB's origin is at the body center (yMin=-0.95),
              // so we lift the wrapper +0.95 to put feet on the ground.
              new Stack3D({
                at: [-7.5, 0.95, 0],
                rot: [0, Math.PI / 6, 0],
                scale: 1.0,
                children: [new GltfModel({
                  asset: '/assets/meshy/fox.glb',
                })],
                key: 'fox_meshy_static',
              }),

              // POS 2: Meshy rigged + multi-state (Idle/Walk/Run/Pant/Sit/Sleep)
              // Built atop the single 'baselayer' walk clip via per-state
              // timeScale + weight + procedural bone overlays.
              new Stack3D({
                at: [-2.5, 0, 0],
                rot: [0, Math.PI / 6, 0],
                scale: 1.0,
                children: [new GltfModelMultiState({
                  asset: '/assets/meshy/fox-rigged-walk.glb',
                  baseClip: 'baselayer',
                  states: MESHY_FOX_STATES,
                  dwell: 4.0,
                  fade: 0.6,
                })],
                key: 'fox_meshy_multistate',
              }),

              // POS 3: Quaternius fox, idle
              new Stack3D({
                at: [2.5, 0, 0],
                rot: [0, Math.PI / 6, 0],
                scale: 1.5,
                children: [new GltfModel({
                  asset: '/assets/quaternius/animals_pack/fox.glb',
                  animation: 'Idle',
                })],
                key: 'fox_quat_idle',
              }),

              // POS 4: Quaternius fox cycling all 12 clips
              new Stack3D({
                at: [7.5, 0, 0],
                rot: [0, Math.PI / 6, 0],
                scale: 1.5,
                children: [new GltfModelCycle({
                  asset: '/assets/quaternius/animals_pack/fox.glb',
                  clips: [
                    'Idle', 'Walk', 'Gallop', 'Eating',
                    'Attack', 'Idle_2', 'Idle_HitReact_Left',
                    'Idle_HitReact_Right', 'Gallop_Jump',
                    'Jump_ToIdle', 'Idle_2_HeadLow', 'Death',
                  ],
                  dwell: 3.5,
                  fade: 0.5,
                })],
                key: 'fox_quat_cycle',
              }),
            ],
          }),
        }),
      ],
    });
  }
}

export default widgetToAssetModule(
  'fox-showcase',
  {
    kind: 'environment',
    name: 'Fox Showcase — AI vs Production',
    description: 'Side-by-side: Meshy AI static (271k, no rig), Meshy AI rigged with 6 synthesized states cycling (Idle/Walk/Run/Pant/Sit/Sleep), Quaternius idle (2k, hand-rigged), Quaternius cycling all 12 baked clips. Demonstrates the spectrum from static AI mesh to production rig.',
  },
  new FoxShowcase(),
);
