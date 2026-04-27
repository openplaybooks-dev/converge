// GltfModel — generic .glb / .gltf loader leaf. Async loads, caches by path,
// deep-clones per instance, optionally plays an animation clip by name.
//
// Use cases:
//   - Static prop:  new GltfModel({ asset: '/assets/dungeon/chest.glb' })
//   - Animated:     new GltfModel({ asset: '/assets/characters/knight.glb', animation: 'Idle' })
//   - Building:     new GltfModel({ asset: '/assets/hexagon/buildings/blue/building_blacksmith_blue.gltf' })
//
// One leaf for everything that ships from disk. Higher-level widgets like
// RealisticBody can be re-implemented as thin wrappers, but for now they stay
// independent so behavior is unchanged.

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

export function loadGltfCached(path: string): Promise<CachedGltf> {
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

export interface GltfModelOpts {
  /** Path to .glb / .gltf file. */
  asset: string;
  /** Animation clip name (must exist in the file). Omit for static props. */
  animation?: string;
  /** Loop mode for the animation. Default 'repeat'. */
  loop?: 'repeat' | 'once' | 'pingpong';
  /** Uniform scale. Default 1. */
  scale?: number;
  /** Offset added to the loaded scene root. */
  position?: [number, number, number];
  /** Euler rotation in radians. */
  rotation?: [number, number, number];
  /** Override castShadow on every mesh. Defaults to inherited Shadows config. */
  castShadow?: boolean;
  /** Override receiveShadow on every mesh. */
  receiveShadow?: boolean;
  key?: string;
}

export class GltfModel extends LeafWidget3D {
  private readonly o: GltfModelOpts;
  constructor(opts: GltfModelOpts) {
    super({ key: opts.key });
    this.o = opts;
  }

  override buildBehaviors(_ctx: BuildContext): Behavior[] {
    const o = this.o;
    return [{
      kind: 'gltf-model',
      config: { asset: o.asset, animation: o.animation, scale: o.scale },
      onBuild(buildCtx) {
        const placeholder = new THREE.Group();
        placeholder.name = 'gltf_model';
        if (o.scale != null) placeholder.scale.setScalar(o.scale);
        if (o.position) placeholder.position.set(...o.position);
        if (o.rotation) placeholder.rotation.set(...o.rotation);

        const shadowsCfg = buildCtx.refs.get('__shadowsConfig') as
          | { cast?: boolean; receive?: boolean }
          | undefined;
        const cast = o.castShadow ?? shadowsCfg?.cast ?? true;
        const receive = o.receiveShadow ?? shadowsCfg?.receive ?? true;

        let mixer: THREE.AnimationMixer | null = null;

        loadGltfCached(o.asset).then((cached) => {
          const clone = cloneSkeleton(cached.scene) as THREE.Group;
          clone.traverse((obj: THREE.Object3D) => {
            if ((obj as THREE.Mesh).isMesh) {
              const m = obj as THREE.Mesh;
              m.castShadow = cast;
              m.receiveShadow = receive;
            }
          });
          placeholder.add(clone);

          if (o.animation && cached.animations.length > 0) {
            mixer = new THREE.AnimationMixer(clone);
            // Loose match: try exact name, then case-insensitive suffix.
            // Quaternius packs prefix clips with `AnimalArmature|`,
            // `FoxArmature|Fox_`, etc — passing `'Idle'` should still resolve.
            const want = o.animation.toLowerCase();
            const clip = cached.animations.find((c) => c.name === o.animation)
              ?? cached.animations.find((c) => c.name.toLowerCase().endsWith('|' + want))
              ?? cached.animations.find((c) => c.name.toLowerCase().endsWith('_' + want))
              ?? cached.animations.find((c) => c.name.toLowerCase().endsWith(want));
            if (clip) {
              const action = mixer.clipAction(clip);
              const lm = o.loop ?? 'repeat';
              if (lm === 'once') action.setLoop(THREE.LoopOnce, 1);
              else if (lm === 'pingpong') action.setLoop(THREE.LoopPingPong, Infinity);
              else action.setLoop(THREE.LoopRepeat, Infinity);
              action.play();
            } else {
              const names = cached.animations.map((c) => c.name).join(', ');
              console.warn(`[GltfModel] ${o.asset}: clip '${o.animation}' not found (have: ${names})`);
            }
          }
        }).catch((err) => {
          console.error(`[GltfModel] load failed: ${o.asset}`, err);
        });

        const tick: Tick = (_t, dt) => { mixer?.update(dt); };
        return { object: placeholder, ticks: [tick] };
      },
    }];
  }
}
