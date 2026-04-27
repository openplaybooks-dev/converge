// GltfModelMultiState — load a rigged GLB with a single baked clip and
// synthesize multiple animation states by combining:
//   1. The base mixer playing the original clip at variable timeScale
//   2. Per-bone procedural overlays applied each frame (sine waves on
//      Hips, head, tail, etc — bone names supplied per state)
//   3. Optional per-state root-level transforms (lower body for sleep,
//      tilt forward for sit, etc)
//
// States are described as { timeScale, weight, overlays?, rootPose? }.
// On tick, the active state's params drive the mixer + apply overlays
// to bones via direct rotation/translation deltas. State changes
// crossfade timeScale and overlay amplitudes over `fade` seconds.
//
// This is NOT real animation authoring — it's a procedural fake that
// works ONLY because the base GLB ships with one good rig + clip we can
// distort. For Idle/Walk/Run/Sit/Sleep on a Meshy auto-rigged model
// that ships with one walk cycle, it's the cheapest way to get visible
// state variety without re-rigging.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { LeafWidget3D, type BuildContext } from '../types.js';
import type { Behavior } from '../../entity/types.js';
import type { Tick } from '../../types.js';

interface CachedGltf {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}

const cache = new Map<string, Promise<CachedGltf>>();
const loader = new GLTFLoader();

function loadCached(path: string): Promise<CachedGltf> {
  let p = cache.get(path);
  if (!p) {
    p = loader.loadAsync(path).then((g) => ({ scene: g.scene, animations: g.animations }));
    cache.set(path, p);
  }
  return p;
}

/**
 * A bone overlay sine wave: bone[axis] += amplitude * sin(t * freq + phase).
 * Applied additively each frame on top of the mixer's pose.
 */
export interface BoneOverlay {
  /** Bone name as it appears in the skeleton (case-sensitive). */
  bone: string;
  /** Apply to which transform component. */
  prop: 'rotation' | 'position';
  /** Apply to which axis of the component. */
  axis: 'x' | 'y' | 'z';
  /** Wave amplitude (radians for rotation, units for position). */
  amplitude: number;
  /** Wave frequency in Hz. */
  freq: number;
  /** Phase offset in radians. */
  phase?: number;
}

export interface AnimState {
  /** State name (for debugging / labels). */
  name: string;
  /**
   * Mixer time scale. 0 freezes the base clip (use overlays to animate).
   * 0.4 = slow (idle/sit), 1.0 = walk speed, 2.0 = run, etc.
   */
  timeScale: number;
  /**
   * Effective weight of the base clip's contribution. 1.0 = full clip
   * pose; 0.0 = T-pose (overlays only). Use 0 for "Sit" and "Sleep" to
   * zero out the leg cycle from the base walk.
   */
  weight: number;
  /** Optional per-bone procedural overlays. */
  overlays?: BoneOverlay[];
  /**
   * Optional root-level pose: applied as offsets to the model's outer
   * group, not to bones. Use for "low body" sleep, "tilt forward" sit.
   */
  rootPose?: {
    positionY?: number;
    rotationX?: number;
    rotationZ?: number;
  };
}

export interface GltfModelMultiStateOpts {
  asset: string;
  /** Base clip name. Loose-match (case-insensitive suffix). */
  baseClip: string;
  /** Ordered list of states to cycle through. First state plays initially. */
  states: AnimState[];
  /** Seconds per state. Default 4. */
  dwell?: number;
  /** Crossfade duration when switching states. Default 0.5. */
  fade?: number;
  scale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  castShadow?: boolean;
  receiveShadow?: boolean;
  key?: string;
}

export class GltfModelMultiState extends LeafWidget3D {
  private readonly o: GltfModelMultiStateOpts;
  constructor(opts: GltfModelMultiStateOpts) {
    super({ key: opts.key });
    this.o = opts;
  }

  override buildBehaviors(_ctx: BuildContext): Behavior[] {
    const o = this.o;
    return [{
      kind: 'gltf-multistate',
      config: { asset: o.asset, baseClip: o.baseClip, states: o.states.map((s) => s.name) },
      onBuild(buildCtx) {
        const placeholder = new THREE.Group();
        placeholder.name = 'gltf_model_multistate';
        if (o.scale != null) placeholder.scale.setScalar(o.scale);
        if (o.position) placeholder.position.set(...o.position);
        if (o.rotation) placeholder.rotation.set(...o.rotation);

        const shadowsCfg = buildCtx.refs.get('__shadowsConfig') as
          | { cast?: boolean; receive?: boolean }
          | undefined;
        const cast = o.castShadow ?? shadowsCfg?.cast ?? true;
        const receive = o.receiveShadow ?? shadowsCfg?.receive ?? true;
        const dwell = o.dwell ?? 4;
        const fade = o.fade ?? 0.5;

        let mixer: THREE.AnimationMixer | null = null;
        let action: THREE.AnimationAction | null = null;
        // Map bone-name → THREE.Bone for fast overlay lookup.
        const boneMap = new Map<string, THREE.Bone>();
        let inner: THREE.Group | null = null;

        // Crossfade state. We blend between two states over `fade` seconds:
        // currentState — full weight at time of last swap
        // nextState    — fades in over fade seconds, then becomes current
        let currentIdx = 0;
        let nextIdx = 0;
        let lastSwapTime = -Infinity;
        let fadeProgress = 1;          // 1 = settled, <1 = mid-fade

        loadCached(o.asset).then((cached) => {
          const clone = cloneSkeleton(cached.scene) as THREE.Group;
          inner = clone;
          clone.traverse((obj: THREE.Object3D) => {
            if ((obj as THREE.Mesh).isMesh) {
              const m = obj as THREE.Mesh;
              m.castShadow = cast;
              m.receiveShadow = receive;
            }
            if ((obj as THREE.Bone).isBone) {
              boneMap.set(obj.name, obj as THREE.Bone);
            }
          });
          placeholder.add(clone);

          if (cached.animations.length === 0) {
            console.warn(`[GltfModelMultiState] ${o.asset}: no clips in GLB`);
            return;
          }
          mixer = new THREE.AnimationMixer(clone);
          // Resolve the base clip via loose-match (same as GltfModel).
          const want = o.baseClip.toLowerCase();
          const clip = cached.animations.find((c) => c.name === o.baseClip)
            ?? cached.animations.find((c) => c.name.toLowerCase().endsWith('|' + want))
            ?? cached.animations.find((c) => c.name.toLowerCase().endsWith('_' + want))
            ?? cached.animations.find((c) => c.name.toLowerCase().endsWith(want))
            ?? cached.animations[0];
          action = mixer.clipAction(clip).setLoop(THREE.LoopRepeat, Infinity);
          action.play();
          // Initial state.
          const s0 = o.states[0];
          mixer.timeScale = s0.timeScale;
          action.setEffectiveWeight(s0.weight);
          lastSwapTime = -Infinity;
        }).catch((err) => {
          console.error(`[GltfModelMultiState] load failed: ${o.asset}`, err);
        });

        const tick: Tick = (t, dt) => {
          if (!mixer) return;
          mixer.update(dt);
          if (lastSwapTime === -Infinity) lastSwapTime = t;

          // Advance state cycle.
          if (fadeProgress >= 1 && t - lastSwapTime >= dwell) {
            currentIdx = nextIdx;
            nextIdx = (nextIdx + 1) % o.states.length;
            lastSwapTime = t;
            fadeProgress = 0;
          }
          if (fadeProgress < 1) {
            fadeProgress = Math.min(1, (t - lastSwapTime) / fade);
          }

          const cur = o.states[currentIdx];
          const nxt = o.states[nextIdx];
          // Crossfade timeScale + weight.
          const blend = fadeProgress;
          const ts = cur.timeScale * (1 - blend) + nxt.timeScale * blend;
          const wt = cur.weight * (1 - blend) + nxt.weight * blend;
          mixer.timeScale = ts;
          if (action) action.setEffectiveWeight(wt);

          // Crossfade root pose.
          const py =
            (cur.rootPose?.positionY ?? 0) * (1 - blend) +
            (nxt.rootPose?.positionY ?? 0) * blend;
          const rx =
            (cur.rootPose?.rotationX ?? 0) * (1 - blend) +
            (nxt.rootPose?.rotationX ?? 0) * blend;
          const rz =
            (cur.rootPose?.rotationZ ?? 0) * (1 - blend) +
            (nxt.rootPose?.rotationZ ?? 0) * blend;
          if (inner) {
            inner.position.y = py;
            inner.rotation.x = rx;
            inner.rotation.z = rz;
          }

          // Apply overlays (sum of cur and nxt overlays, weighted by blend).
          // We additively bias bones AFTER the mixer step so the bias rides
          // on top of the mixer's pose. Reset bias each frame by re-zeroing.
          // Strategy: collect (bone, prop, axis) → delta, apply.
          const deltas = new Map<THREE.Bone, { rot: THREE.Vector3; pos: THREE.Vector3 }>();
          function accumulate(state: AnimState, weight: number): void {
            if (!state.overlays || weight <= 0) return;
            for (const ov of state.overlays) {
              const bone = boneMap.get(ov.bone);
              if (!bone) continue;
              const phase = ov.phase ?? 0;
              const value = Math.sin(t * ov.freq * Math.PI * 2 + phase) * ov.amplitude * weight;
              let d = deltas.get(bone);
              if (!d) {
                d = { rot: new THREE.Vector3(), pos: new THREE.Vector3() };
                deltas.set(bone, d);
              }
              const target = ov.prop === 'rotation' ? d.rot : d.pos;
              target[ov.axis] += value;
            }
          }
          accumulate(cur, 1 - blend);
          accumulate(nxt, blend);
          // Apply the deltas. Mixer is non-additive so we set absolute
          // rotation/position from delta = base + overlay. Three.js
          // skinned-mesh bones expose euler rotation directly.
          for (const [bone, d] of deltas) {
            bone.rotation.x += d.rot.x;
            bone.rotation.y += d.rot.y;
            bone.rotation.z += d.rot.z;
            bone.position.x += d.pos.x;
            bone.position.y += d.pos.y;
            bone.position.z += d.pos.z;
          }
        };

        return { object: placeholder, ticks: [tick] };
      },
    }];
  }
}
