// RealisticBody — load a Mixamo-style .glb humanoid and play its built-in
// animations. This is a different kind of asset from our procedural ones —
// it ships with its own skeleton, materials, and (often) animation clips.
//
// Strategy:
//   1. Async-load the .glb via GLTFLoader. Cache the result.
//   2. Clone the loaded scene (so multiple instances don't share bones).
//   3. Add the cloned scene under our placeholder. The .glb's skeleton +
//      bones come along — they live as children of the scene root.
//   4. Build a separate THREE.AnimationMixer on the cloned scene. Pick an
//      animation clip by name (default "Idle") and play it.
//   5. Register a tick that calls mixer.update(dt) every frame.
//
// This deliberately ignores our 73-bone rig. The .glb has its own skeleton,
// its own rest pose, and its own animations. Mixing them with our procedural
// rig caused visual chaos in the previous (failed) retargeting attempt.
//
// Trade-off: a Hero with bodyMode='realistic' won't respond to our existing
// Idle/Walk/Wave clips. Authors pick from the .glb's built-in clip list
// (e.g., the Soldier ships with Idle/Walk/Run/TPose) via the `animation` opt.

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

function loadGltf(path: string): Promise<CachedGltf> {
  let p = cache.get(path);
  if (!p) {
    p = loader.loadAsync(path).then((gltf) => ({
      scene: gltf.scene,
      animations: gltf.animations,
    }));
    cache.set(path, p);
  }
  return p;
}

export interface RealisticBodyOpts {
  /** Path to the .glb/.gltf file. */
  asset: string;
  /** Name of the animation clip to play. Default: 'Idle'. */
  animation?: string;
  /** Loop mode for the animation. Default: 'repeat'. */
  loop?: 'repeat' | 'once' | 'pingpong';
  /** Uniform scale to apply (some glTFs are unit-meter sized, others not). */
  scale?: number;
  /** Vertical offset (some skeletons have feet at y=0, others have hips at y=0). */
  yOffset?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
  key?: string;
}

export class RealisticBody extends LeafWidget3D {
  private readonly opts: RealisticBodyOpts;
  constructor(opts: RealisticBodyOpts) {
    super({ key: opts.key });
    this.opts = opts;
  }

  override buildBehaviors(_ctx: BuildContext): Behavior[] {
    const opts = this.opts;
    return [{
      kind: 'realistic-body',
      config: { asset: opts.asset, animation: opts.animation, scale: opts.scale },
      onBuild(buildCtx) {
        const placeholder = new THREE.Group();
        placeholder.name = 'realistic_body';
        if (opts.scale != null) placeholder.scale.setScalar(opts.scale);
        if (opts.yOffset != null) placeholder.position.y = opts.yOffset;

        const shadowsCfg = buildCtx.refs.get('__shadowsConfig') as
          | { cast?: boolean; receive?: boolean }
          | undefined;
        const cast = opts.castShadow ?? shadowsCfg?.cast ?? true;
        const receive = opts.receiveShadow ?? shadowsCfg?.receive ?? true;

        // Mixer + tick state. Resolved when the .glb loads; tick is a
        // no-op until then.
        let mixer: THREE.AnimationMixer | null = null;

        loadGltf(opts.asset).then((cached) => {
          // Deep-clone scene + skeleton so multiple RealisticBody instances
          // can share the cached load without sharing bone state.
          const clone = cloneSkeleton(cached.scene) as THREE.Group;
          clone.traverse((o: THREE.Object3D) => {
            if ((o as THREE.Mesh).isMesh) {
              const m = o as THREE.Mesh;
              m.castShadow = cast;
              m.receiveShadow = receive;
            }
          });
          placeholder.add(clone);

          if (cached.animations.length > 0) {
            mixer = new THREE.AnimationMixer(clone);
            const wantName = opts.animation ?? 'Idle';
            const clip = cached.animations.find((c) => c.name === wantName)
              ?? cached.animations[0];
            const action = mixer.clipAction(clip);
            const loopMode = opts.loop ?? 'repeat';
            if (loopMode === 'once') action.setLoop(THREE.LoopOnce, 1);
            else if (loopMode === 'pingpong') action.setLoop(THREE.LoopPingPong, Infinity);
            else action.setLoop(THREE.LoopRepeat, Infinity);
            action.play();
          } else {
            console.warn(`[RealisticBody] ${opts.asset} has no animation clips`);
          }
        }).catch((err) => {
          console.error(`[RealisticBody] load failed: ${opts.asset}`, err);
        });

        const tick: Tick = (_t, dt) => { mixer?.update(dt); };
        return { object: placeholder, ticks: [tick] };
      },
    }];
  }
}
