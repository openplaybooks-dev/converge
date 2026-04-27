// Clip — author skeletal animation clips that compile to THREE.AnimationClip
// against a ResolvedRig at materialize time.
//
// Authoring DSL:
//   Clip.author({
//     name: 'wave', duration: 1.5, loop: 'once',
//     tracks: [{ bone: 'arm_R', kind: 'rotation',
//                keys: [{ t: 0, v: [0,0,0] }, { t: 0.4, v: [0,0,-2.4] }, ...] }]
//   })
//
// The compiled clip targets bones by name via the standard THREE binding path
// "<boneName>.quaternion" / "<boneName>.position", so the AnimationMixer can
// drive them directly.

import * as THREE from 'three';
import type { ResolvedRig } from './rig.js';

export type TrackKind = 'position' | 'rotation' | 'quaternion' | 'scale';
export type Vec3 = [number, number, number];

export interface Keyframe<T> {
  t: number;
  v: T;
  ease?: 'linear' | 'step' | 'smooth';
}

export interface TrackSpec {
  bone: string;
  kind: TrackKind;
  keys: Array<Keyframe<Vec3>>;
}

export interface ClipSpec {
  name: string;
  duration: number;
  loop?: 'repeat' | 'pingpong' | 'once';
  tracks: TrackSpec[];
  tags?: string[];
}

export interface AuthoredClip {
  readonly spec: ClipSpec;
  /** Compile against a concrete rig. The result targets that rig's bones. */
  compile(rig: ResolvedRig): THREE.AnimationClip;
}

function easeToInterp(ease: Keyframe<unknown>['ease']): THREE.InterpolationModes {
  if (ease === 'step') return THREE.InterpolateDiscrete;
  if (ease === 'smooth') return THREE.InterpolateSmooth;
  return THREE.InterpolateLinear;
}

/** Quaternion tracks only support linear/discrete (smooth Catmull-Rom doesn't apply). */
function quaternionInterp(ease: Keyframe<unknown>['ease']): THREE.InterpolationModes {
  if (ease === 'step') return THREE.InterpolateDiscrete;
  return THREE.InterpolateLinear;
}

function compileTrack(spec: TrackSpec, rig: ResolvedRig): THREE.KeyframeTrack {
  // Resolve bone (must exist; clip authoring is strict here).
  if (!rig.bones[spec.bone]) {
    throw new Error(
      `[clip] Track references unknown bone '${spec.bone}'. ` +
        `Known: ${Object.keys(rig.bones).join(', ')}`,
    );
  }

  const times = new Float32Array(spec.keys.map((k) => k.t));
  const firstEase = spec.keys[0]?.ease;
  const interp = easeToInterp(firstEase);
  const qInterp = quaternionInterp(firstEase);

  if (spec.kind === 'position' || spec.kind === 'scale') {
    const values = new Float32Array(spec.keys.length * 3);
    for (let i = 0; i < spec.keys.length; i++) {
      const v = spec.keys[i].v;
      values[i * 3 + 0] = v[0];
      values[i * 3 + 1] = v[1];
      values[i * 3 + 2] = v[2];
    }
    const path = `${spec.bone}.${spec.kind}`;
    return new THREE.VectorKeyframeTrack(path, Array.from(times), Array.from(values), interp);
  }

  if (spec.kind === 'quaternion') {
    // Author already gave quaternion components; pass through (assume xyzw if length 4 keys).
    const values = new Float32Array(spec.keys.length * 4);
    for (let i = 0; i < spec.keys.length; i++) {
      const v = spec.keys[i].v as unknown as [number, number, number, number];
      values[i * 4 + 0] = v[0];
      values[i * 4 + 1] = v[1];
      values[i * 4 + 2] = v[2];
      values[i * 4 + 3] = v[3];
    }
    return new THREE.QuaternionKeyframeTrack(
      `${spec.bone}.quaternion`,
      Array.from(times),
      Array.from(values),
      qInterp,
    );
  }

  // 'rotation' — author wrote Euler XYZ; convert to Quaternion per-key.
  const values = new Float32Array(spec.keys.length * 4);
  const e = new THREE.Euler();
  const q = new THREE.Quaternion();
  for (let i = 0; i < spec.keys.length; i++) {
    const v = spec.keys[i].v;
    e.set(v[0], v[1], v[2], 'XYZ');
    q.setFromEuler(e);
    values[i * 4 + 0] = q.x;
    values[i * 4 + 1] = q.y;
    values[i * 4 + 2] = q.z;
    values[i * 4 + 3] = q.w;
  }
  return new THREE.QuaternionKeyframeTrack(
    `${spec.bone}.quaternion`,
    Array.from(times),
    Array.from(values),
    qInterp,
  );
}

function authorClip(spec: ClipSpec): AuthoredClip {
  return {
    spec,
    compile(rig: ResolvedRig): THREE.AnimationClip {
      const tracks = spec.tracks.map((t) => compileTrack(t, rig));
      return new THREE.AnimationClip(spec.name, spec.duration, tracks);
    },
  };
}

/** Sine-driven track sugar — emits ~16 keys over the period. */
function sineTrack(opts: {
  bone: string;
  kind: 'position' | 'rotation';
  axis: 'x' | 'y' | 'z';
  amplitude: number;
  period: number;
  phase?: number;
  steps?: number;
}): TrackSpec {
  const steps = opts.steps ?? 16;
  const phase = opts.phase ?? 0;
  const axisIdx = opts.axis === 'x' ? 0 : opts.axis === 'y' ? 1 : 2;
  const keys: Array<Keyframe<Vec3>> = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * opts.period;
    const v: Vec3 = [0, 0, 0];
    v[axisIdx] = Math.sin(((t / opts.period) * Math.PI * 2) + phase) * opts.amplitude;
    keys.push({ t, v, ease: 'smooth' });
  }
  return { bone: opts.bone, kind: opts.kind, keys };
}

function fromTHREE(clip: THREE.AnimationClip, tags: string[] = []): AuthoredClip {
  return {
    spec: {
      name: clip.name,
      duration: clip.duration,
      loop: 'repeat',
      tracks: [],
      tags,
    },
    compile(_rig: ResolvedRig): THREE.AnimationClip {
      // Pass-through; bindings already encoded in the clip's tracks.
      return clip;
    },
  };
}

export const Clip = {
  author: authorClip,
  sine: sineTrack,
  fromTHREE,
} as const;
