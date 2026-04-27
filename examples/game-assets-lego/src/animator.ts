// Animator — skeletal-clip + procedural-tick animation behaviors.
//
// Skeletal clips:  Animator.clip('walk') resolves a clip from the registry,
//                  compiles it against the entity's rig, plays it on the
//                  entity's mixer. The mixer.update(dt) is added to the
//                  composed userData.tick.
//
// Procedural ticks: Animator.tick, .spin, .bob, .lensPulse, .followPath
//                  preserve the existing c.animate.* power. They register
//                  ticks (with optional BoneRef target via the rig).
//
// Per-frame order on the entity root: mixer.update(dt) FIRST (clips set bone
// poses), THEN procedural ticks (additive layer), then post-process wrappers.

import * as THREE from 'three';
import type { Behavior, BuildCtx } from './entity/types.js';
import type { Tick } from './types.js';
import type { BoneRef, ResolvedRig } from './rig.js';
import { Clips } from './clip-registry.js';

const RIG_KEY = 'rig';
const MIXER_KEY = 'mixer';

/** Get-or-create the mixer attached to the entity's rig. */
function getMixer(ctx: BuildCtx): THREE.AnimationMixer {
  const existing = ctx.refs.get(MIXER_KEY) as THREE.AnimationMixer | undefined;
  if (existing) return existing;
  const rig = ctx.refs.get(RIG_KEY) as ResolvedRig | undefined;
  if (!rig) {
    throw new Error(
      '[animator] No rig on this entity — Animator.clip requires Rig.* before any Animator behaviors.',
    );
  }
  const mixer = new THREE.AnimationMixer(rig.root);
  ctx.refs.set(MIXER_KEY, mixer);
  // Register the mixer-update tick FIRST so clips run before procedural ticks.
  ctx.ticks.unshift((_t, dt) => mixer.update(dt));
  return mixer;
}

/** Resolve an optional BoneRef|tag|Object3D to a target Object3D, falling back to root.
 *
 * Resolution order for a string ref:
 *   1. If a Rig is installed, treat as BoneRef (role or bone name).
 *   2. Otherwise look up `ctx.refs.get(string)` — set by Mesh.tag('foo') and
 *      Stack3D.named().
 *   3. If neither matches, warn and return ctx.root.
 */
function resolveTarget(
  ctx: BuildCtx,
  ref: BoneRef | THREE.Object3D | undefined,
): THREE.Object3D {
  if (ref === undefined) return ctx.root;
  if (typeof ref === 'object' && 'isObject3D' in ref) return ref;
  const rig = ctx.refs.get(RIG_KEY) as ResolvedRig | undefined;
  if (rig) {
    try {
      return rig.resolve(ref as BoneRef);
    } catch {
      // Fall through to ref-tag lookup.
    }
  }
  if (typeof ref === 'string') {
    const tagged = ctx.refs.get(ref) as THREE.Object3D | undefined;
    if (tagged && (tagged as THREE.Object3D).isObject3D) return tagged;
  }
  console.warn(`[animator] cannot resolve target ${String(ref)}; using entity root.`);
  return ctx.root;
}

// ── Skeletal clip ─────────────────────────────────────────────────────────

function clip(name: string, opts: { autoplay?: boolean; weight?: number } = {}): Behavior {
  return {
    kind: 'animator-clip',
    config: { name, opts },
    onBuild(ctx) {
      const mixer = getMixer(ctx);
      const rig = ctx.refs.get(RIG_KEY) as ResolvedRig;
      const compiled = Clips.get(name).compile(rig);
      const action = mixer.clipAction(compiled);
      const loop = Clips.get(name).spec.loop ?? 'repeat';
      if (loop === 'once') action.setLoop(THREE.LoopOnce, 1);
      else if (loop === 'pingpong') action.setLoop(THREE.LoopPingPong, Infinity);
      else action.setLoop(THREE.LoopRepeat, Infinity);
      if (opts.weight != null) action.setEffectiveWeight(opts.weight);
      if (opts.autoplay !== false) action.play();
      return {};
    },
  };
}

// ── Procedural ticks (preserve current c.animate.* power) ─────────────────

function spin(opts: { target?: BoneRef | THREE.Object3D; axis?: 'x' | 'y' | 'z'; speed?: number } = {}): Behavior {
  return {
    kind: 'animator-spin',
    config: opts,
    onBuild(ctx) {
      const target = resolveTarget(ctx, opts.target);
      const axis = opts.axis ?? 'y';
      const speed = opts.speed ?? 1;
      const fn: Tick = (_t, dt) => {
        target.rotation[axis] += speed * dt;
      };
      return { ticks: [fn] };
    },
  };
}

function bob(opts: { target?: BoneRef | THREE.Object3D; amplitude?: number; period?: number; baseY?: number } = {}): Behavior {
  return {
    kind: 'animator-bob',
    config: opts,
    onBuild(ctx) {
      const target = resolveTarget(ctx, opts.target);
      const amp = opts.amplitude ?? 0.05;
      const period = opts.period ?? 2;
      const baseY = opts.baseY ?? target.position.y;
      const fn: Tick = (t) => {
        target.position.y = baseY + Math.sin((t / period) * Math.PI * 2) * amp;
      };
      return { ticks: [fn] };
    },
  };
}

function lensPulse(material: THREE.Material, opts: { rate?: number; min?: number; max?: number } = {}): Behavior {
  return {
    kind: 'animator-lensPulse',
    config: opts,
    onBuild() {
      const rate = opts.rate ?? 4;
      const min = opts.min ?? 0.7;
      const max = opts.max ?? 1.3;
      const mat = material as THREE.Material & {
        emissiveIntensity?: number;
        userData?: { baseEmit?: number };
      };
      const baseEmit = mat.userData?.baseEmit ?? mat.emissiveIntensity ?? 1;
      const fn: Tick = (t) => {
        const k = 0.5 + 0.5 * Math.sin(t * rate) * Math.sin(t * rate * 0.42);
        mat.emissiveIntensity = baseEmit * (min + (max - min) * k);
      };
      return { ticks: [fn] };
    },
  };
}

function followPath(
  curve: THREE.Curve<THREE.Vector3>,
  opts: { target?: BoneRef | THREE.Object3D; speed?: number; lookAhead?: boolean } = {},
): Behavior {
  return {
    kind: 'animator-followPath',
    config: opts,
    onBuild(ctx) {
      const target = resolveTarget(ctx, opts.target);
      const speed = opts.speed ?? 0.1;
      const lookAhead = opts.lookAhead ?? true;
      let u = 0;
      const tmp = new THREE.Vector3();
      const tan = new THREE.Vector3();
      const fn: Tick = (_t, dt) => {
        u = (u + speed * dt) % 1;
        curve.getPoint(u, tmp);
        target.position.copy(tmp);
        if (lookAhead) {
          curve.getTangent(u, tan);
          target.lookAt(tmp.clone().add(tan));
        }
      };
      return { ticks: [fn] };
    },
  };
}

function gateOnVelocity(inner: Tick, opts: { minSpeed?: number; smooth?: number } = {}): Behavior {
  return {
    kind: 'animator-gateOnVelocity',
    config: opts,
    onBuild(ctx) {
      const minSpeed = opts.minSpeed ?? 0.05;
      const smooth = opts.smooth ?? 0.85;
      const last = new THREE.Vector3();
      const cur = new THREE.Vector3();
      let movingSpeed = 0;
      const host = ctx.root;
      const fn: Tick = (t, dt) => {
        host.getWorldPosition(cur);
        const speed = cur.distanceTo(last) / Math.max(dt, 1e-3);
        movingSpeed = movingSpeed * smooth + speed * (1 - smooth);
        last.copy(cur);
        if (movingSpeed > minSpeed) inner(t, dt);
      };
      return { ticks: [fn] };
    },
  };
}

function tick(_name: string, fn: Tick): Behavior {
  return {
    kind: 'animator-tick',
    config: { name: _name },
    onBuild() {
      return { ticks: [fn] };
    },
  };
}

// ── Locomotion FSM ────────────────────────────────────────────────────────

function locomotion(opts: {
  idle?: string;
  walk?: string;
  run?: string;
  thresholds?: { walk: number; run?: number };
  crossfade?: number;
} = {}): Behavior {
  return {
    kind: 'animator-locomotion',
    config: opts,
    onBuild(ctx) {
      const idleName = opts.idle ?? 'idle';
      const walkName = opts.walk ?? 'walk';
      const runName = opts.run;
      const thrWalk = opts.thresholds?.walk ?? 0.05;
      const thrRun = opts.thresholds?.run ?? 1.5;
      const fade = opts.crossfade ?? 0.2;

      const mixer = getMixer(ctx);
      const rig = ctx.refs.get(RIG_KEY) as ResolvedRig;

      const actions: Record<string, THREE.AnimationAction> = {};
      for (const name of [idleName, walkName, runName].filter(Boolean) as string[]) {
        if (!Clips.has(name)) continue;
        const action = mixer.clipAction(Clips.get(name).compile(rig));
        action.setLoop(THREE.LoopRepeat, Infinity);
        actions[name] = action;
      }
      // Start in idle.
      actions[idleName]?.setEffectiveWeight(1).play();

      const last = new THREE.Vector3();
      const cur = new THREE.Vector3();
      let movingSpeed = 0;
      let currentName = idleName;
      const host = ctx.root;
      const fn: Tick = (_t, dt) => {
        host.getWorldPosition(cur);
        const speed = cur.distanceTo(last) / Math.max(dt, 1e-3);
        movingSpeed = movingSpeed * 0.85 + speed * 0.15;
        last.copy(cur);

        let want = idleName;
        if (movingSpeed > thrWalk) want = walkName;
        if (runName && movingSpeed > thrRun) want = runName;
        if (want !== currentName && actions[want]) {
          actions[currentName]?.fadeOut(fade);
          actions[want].reset().fadeIn(fade).play();
          currentName = want;
        }
      };
      return { ticks: [fn] };
    },
  };
}

export const Animator = {
  clip,
  tick,
  spin,
  bob,
  lensPulse,
  followPath,
  gateOnVelocity,
  locomotion,
} as const;
