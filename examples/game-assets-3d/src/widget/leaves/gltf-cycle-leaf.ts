// GltfModelCycle — like GltfModel, but cycles through a list of animation
// clips. Each clip plays for `dwell` seconds, then crossfades to the next
// clip in the list. Great for showcasing a rigged character's full
// repertoire in one viewer entry without needing to scrub clips manually.

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
    p = loader.loadAsync(path).then((g) => ({
      scene: g.scene,
      animations: g.animations,
    }));
    cache.set(path, p);
  }
  return p;
}

export interface GltfModelCycleOpts {
  asset: string;
  /**
   * Ordered list of clip names to cycle through. Each name supports the
   * same loose-match (case-insensitive suffix) as GltfModel's `animation`
   * option, so 'Idle' matches 'AnimalArmature|Idle'.
   *
   * If omitted, cycles through ALL clips in the GLB in their authored order.
   */
  clips?: string[];
  /** Seconds to spend on each clip before crossfading. Default 4. */
  dwell?: number;
  /** Crossfade duration in seconds. Default 0.4. */
  fade?: number;
  scale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  castShadow?: boolean;
  receiveShadow?: boolean;
  key?: string;
}

export class GltfModelCycle extends LeafWidget3D {
  private readonly o: GltfModelCycleOpts;
  constructor(opts: GltfModelCycleOpts) {
    super({ key: opts.key });
    this.o = opts;
  }

  override buildBehaviors(_ctx: BuildContext): Behavior[] {
    const o = this.o;
    return [{
      kind: 'gltf-model-cycle',
      config: { asset: o.asset, clips: o.clips, dwell: o.dwell ?? 4 },
      onBuild(buildCtx) {
        const placeholder = new THREE.Group();
        placeholder.name = 'gltf_model_cycle';
        if (o.scale != null) placeholder.scale.setScalar(o.scale);
        if (o.position) placeholder.position.set(...o.position);
        if (o.rotation) placeholder.rotation.set(...o.rotation);

        const shadowsCfg = buildCtx.refs.get('__shadowsConfig') as
          | { cast?: boolean; receive?: boolean }
          | undefined;
        const cast = o.castShadow ?? shadowsCfg?.cast ?? true;
        const receive = o.receiveShadow ?? shadowsCfg?.receive ?? true;
        const dwell = o.dwell ?? 4;
        const fade = o.fade ?? 0.4;

        let mixer: THREE.AnimationMixer | null = null;
        let actions: THREE.AnimationAction[] = [];
        let currentIdx = 0;
        let lastSwapTime = -Infinity;
        let labelMesh: THREE.Sprite | null = null;
        let clipNames: string[] = [];

        loadCached(o.asset).then((cached) => {
          const clone = cloneSkeleton(cached.scene) as THREE.Group;
          clone.traverse((obj: THREE.Object3D) => {
            if ((obj as THREE.Mesh).isMesh) {
              const m = obj as THREE.Mesh;
              m.castShadow = cast;
              m.receiveShadow = receive;
            }
          });
          placeholder.add(clone);

          if (cached.animations.length === 0) return;
          mixer = new THREE.AnimationMixer(clone);

          // Resolve clip list.
          let resolved: THREE.AnimationClip[];
          if (o.clips && o.clips.length > 0) {
            resolved = [];
            for (const want of o.clips) {
              const w = want.toLowerCase();
              const clip = cached.animations.find((c) => c.name === want)
                ?? cached.animations.find((c) => c.name.toLowerCase().endsWith('|' + w))
                ?? cached.animations.find((c) => c.name.toLowerCase().endsWith('_' + w))
                ?? cached.animations.find((c) => c.name.toLowerCase().endsWith(w));
              if (clip) resolved.push(clip);
              else console.warn(`[GltfModelCycle] ${o.asset}: clip '${want}' not found`);
            }
          } else {
            resolved = cached.animations.slice();
          }
          if (resolved.length === 0) return;
          actions = resolved.map((c) => mixer!.clipAction(c).setLoop(THREE.LoopRepeat, Infinity));
          clipNames = resolved.map((c) => c.name);
          actions[0].play();
          actions[0].setEffectiveWeight(1);
          for (let i = 1; i < actions.length; i++) {
            actions[i].play();
            actions[i].setEffectiveWeight(0);
          }
          lastSwapTime = -Infinity;
        }).catch((err) => {
          console.error(`[GltfModelCycle] load failed: ${o.asset}`, err);
        });

        const tick: Tick = (t, dt) => {
          mixer?.update(dt);
          if (actions.length < 2) return;
          if (lastSwapTime === -Infinity) lastSwapTime = t;
          if (t - lastSwapTime >= dwell) {
            const next = (currentIdx + 1) % actions.length;
            // Crossfade
            actions[currentIdx].crossFadeTo(actions[next], fade, false);
            currentIdx = next;
            lastSwapTime = t;
          }
        };

        // Stash clip-list metadata for callers that want to render a label
        (placeholder.userData as { cycleInfo?: { clipNames: string[]; current: () => number } }).cycleInfo = {
          clipNames,
          current: () => currentIdx,
        };

        return { object: placeholder, ticks: [tick] };
      },
    }];
  }
}
