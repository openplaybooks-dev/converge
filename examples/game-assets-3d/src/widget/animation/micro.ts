// Micro-animation widgets — atomic leaves a high-level animation widget can
// list as its `build()` output. Each emits one Animator.* behavior.
//
// These are deliberately small and orthogonal:
//   - BoneSpin       : continuous rotation of a bone or the entity root
//   - BoneBob        : sinusoidal y-position oscillation
//   - BoneSineRot    : sinusoidal rotation around an axis (gait, sway)
//   - ClipPlay       : play a registered AnimationClip on the rig
//   - LensPulse      : pulsate a material's emissive intensity
//   - FollowPath     : move along a curve
//   - GateOnVelocity : run an inner tick only when the host moves
//
// High-level animations (Walk, Wave, Breath) are StatelessWidget3D subclasses
// in cascade.ts that return a list of these leaves.

import * as THREE from 'three';
import { Animator } from '../../animator.js';
import type { Behavior } from '../../entity/types.js';
import type { BoneRef } from '../../rig.js';
import type { Tick } from '../../types.js';
import { LeafWidget3D, type BuildContext } from '../types.js';

interface KeyOpt { key?: string }

// ── BoneSpin ──
export class BoneSpin extends LeafWidget3D {
  private readonly o: { target?: BoneRef; axis?: 'x' | 'y' | 'z'; speed?: number } & KeyOpt;
  constructor(opts: { target?: BoneRef; axis?: 'x' | 'y' | 'z'; speed?: number; key?: string } = {}) {
    super({ key: opts.key }); this.o = opts;
  }
  override buildBehaviors(_ctx: BuildContext): Behavior[] {
    return [Animator.spin(this.o)];
  }
}

// ── BoneBob ──
export class BoneBob extends LeafWidget3D {
  private readonly o: { target?: BoneRef; amplitude?: number; period?: number; baseY?: number } & KeyOpt;
  constructor(opts: { target?: BoneRef; amplitude?: number; period?: number; baseY?: number; key?: string } = {}) {
    super({ key: opts.key }); this.o = opts;
  }
  override buildBehaviors(_ctx: BuildContext): Behavior[] {
    return [Animator.bob(this.o)];
  }
}

// ── BoneSineRot ── (Animator.tick wrapping a sine on bone.rotation[axis])
export class BoneSineRot extends LeafWidget3D {
  private readonly o: {
    target: BoneRef;
    axis: 'x' | 'y' | 'z';
    amplitude: number;
    period: number;
    phase?: number;
  } & KeyOpt;
  constructor(opts: {
    target: BoneRef;
    axis: 'x' | 'y' | 'z';
    amplitude: number;
    period: number;
    phase?: number;
    key?: string;
  }) {
    super({ key: opts.key }); this.o = opts;
  }
  override buildBehaviors(_ctx: BuildContext): Behavior[] {
    const { target, axis, amplitude, period, phase = 0 } = this.o;
    return [{
      kind: 'animator-bone-sine-rot',
      config: this.o,
      onBuild(ctx) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rig = ctx.refs.get('rig') as any;
        if (!rig) {
          console.warn(`[BoneSineRot] no rig — skipping ${String(target)} sine`);
          return {};
        }
        const bone = rig.resolve(target);
        const fn: Tick = (t) => {
          bone.rotation[axis] = Math.sin((t / period) * Math.PI * 2 + phase) * amplitude;
        };
        return { ticks: [fn] };
      },
    }];
  }
}

// ── ClipPlay ──
export class ClipPlay extends LeafWidget3D {
  private readonly name: string;
  private readonly o: { autoplay?: boolean; weight?: number } & KeyOpt;
  constructor(name: string, opts: { autoplay?: boolean; weight?: number; key?: string } = {}) {
    super({ key: opts.key }); this.name = name; this.o = opts;
  }
  override buildBehaviors(_ctx: BuildContext): Behavior[] {
    return [Animator.clip(this.name, this.o)];
  }
}

// ── LensPulse ──
export class LensPulse extends LeafWidget3D {
  private readonly material: THREE.Material;
  private readonly o: { rate?: number; min?: number; max?: number } & KeyOpt;
  constructor(material: THREE.Material, opts: { rate?: number; min?: number; max?: number; key?: string } = {}) {
    super({ key: opts.key }); this.material = material; this.o = opts;
  }
  override buildBehaviors(_ctx: BuildContext): Behavior[] {
    return [Animator.lensPulse(this.material, this.o)];
  }
}

// ── FollowPath ──
export class FollowPath extends LeafWidget3D {
  private readonly curve: THREE.Curve<THREE.Vector3>;
  private readonly o: { target?: BoneRef; speed?: number; lookAhead?: boolean } & KeyOpt;
  constructor(curve: THREE.Curve<THREE.Vector3>, opts: { target?: BoneRef; speed?: number; lookAhead?: boolean; key?: string } = {}) {
    super({ key: opts.key }); this.curve = curve; this.o = opts;
  }
  override buildBehaviors(_ctx: BuildContext): Behavior[] {
    return [Animator.followPath(this.curve, this.o)];
  }
}

// ── ShaderTime ── Drives a `uTime` uniform on a ShaderMaterial each frame.
// Used by 'fire' material (campfire) and any other custom shader that needs
// frame time. Resolves the target by tag — the mesh whose material has the
// uniform should be tagged so we can reach its material.
export class ShaderTime extends LeafWidget3D {
  private readonly tag: string;
  private readonly uniformName: string;
  constructor(opts: { tag: string; uniformName?: string; key?: string }) {
    super({ key: opts.key });
    this.tag = opts.tag;
    this.uniformName = opts.uniformName ?? 'uTime';
  }
  override buildBehaviors(_ctx: BuildContext): Behavior[] {
    const tag = this.tag;
    const uName = this.uniformName;
    return [{
      kind: 'animator-shader-time',
      config: { tag, uniformName: uName },
      onBuild(ctx) {
        const mesh = ctx.refs.get(tag) as THREE.Mesh | undefined;
        if (!mesh || !(mesh as THREE.Mesh).isMesh) {
          console.warn(`[ShaderTime] no mesh tagged '${tag}'`);
          return {};
        }
        const mat = mesh.material as THREE.ShaderMaterial;
        if (!mat || !mat.uniforms || !mat.uniforms[uName]) {
          console.warn(`[ShaderTime] mesh '${tag}' has no uniform '${uName}'`);
          return {};
        }
        const uniform = mat.uniforms[uName];
        const fn: Tick = (t) => { uniform.value = t; };
        return { ticks: [fn] };
      },
    }];
  }
}

// ── BoneOscillate ── velocity-modulated spin: rotation += sin(t*P)*amp*dt
export class BoneOscillate extends LeafWidget3D {
  private readonly o: { target?: BoneRef | string; axis?: 'x' | 'y' | 'z'; baseSpeed: number; period: number; key?: string };
  constructor(opts: { target?: BoneRef | string; axis?: 'x' | 'y' | 'z'; baseSpeed: number; period: number; key?: string }) {
    super({ key: opts.key });
    this.o = opts;
  }
  override buildBehaviors(_ctx: BuildContext): Behavior[] {
    const o = this.o;
    return [{
      kind: 'animator-bone-oscillate',
      config: o,
      onBuild(ctx) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rig = ctx.refs.get('rig') as any;
        let target: THREE.Object3D = ctx.root;
        if (o.target) {
          if (typeof o.target === 'string' && rig) {
            try { target = rig.resolve(o.target); } catch {}
          } else if (typeof o.target === 'string') {
            const ref = ctx.refs.get(o.target);
            if (ref && (ref as THREE.Object3D).isObject3D) target = ref as THREE.Object3D;
          }
        }
        const axis = o.axis ?? 'y';
        const period = o.period;
        const baseSpeed = o.baseSpeed;
        const fn: Tick = (t, dt) => {
          const modulator = Math.sin((t / period) * Math.PI * 2);
          target.rotation[axis] += baseSpeed * modulator * dt;
        };
        return { ticks: [fn] };
      },
    }];
  }
}

// ── Drift ── constant translation, optional axis-wrap
export class Drift extends LeafWidget3D {
  private readonly o: {
    target?: BoneRef | string;
    velocity: [number, number, number];
    wrap?: { axis: 'x' | 'y' | 'z'; min: number; max: number };
    key?: string;
  };
  constructor(opts: {
    target?: BoneRef | string;
    velocity: [number, number, number];
    wrap?: { axis: 'x' | 'y' | 'z'; min: number; max: number };
    key?: string;
  }) {
    super({ key: opts.key });
    this.o = opts;
  }
  override buildBehaviors(_ctx: BuildContext): Behavior[] {
    const o = this.o;
    return [{
      kind: 'animator-drift',
      config: o,
      onBuild(ctx) {
        let target: THREE.Object3D = ctx.root;
        if (o.target) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rig = ctx.refs.get('rig') as any;
          if (typeof o.target === 'string' && rig) {
            try { target = rig.resolve(o.target); } catch {}
          } else if (typeof o.target === 'string') {
            const ref = ctx.refs.get(o.target);
            if (ref && (ref as THREE.Object3D).isObject3D) target = ref as THREE.Object3D;
          }
        }
        const fn: Tick = (_t, dt) => {
          target.position.x += o.velocity[0] * dt;
          target.position.y += o.velocity[1] * dt;
          target.position.z += o.velocity[2] * dt;
          if (o.wrap) {
            const v = target.position[o.wrap.axis];
            const span = o.wrap.max - o.wrap.min;
            if (v > o.wrap.max) target.position[o.wrap.axis] = o.wrap.min + ((v - o.wrap.min) % span);
            if (v < o.wrap.min) target.position[o.wrap.axis] = o.wrap.max - ((o.wrap.min - v) % span);
          }
        };
        return { ticks: [fn] };
      },
    }];
  }
}

// ── SunOrbit ── orbits a tagged DirectionalLight around the origin
export class SunOrbit extends LeafWidget3D {
  private readonly o: { sunTag?: string; radius: number; height: number; period: number; key?: string };
  constructor(opts: { sunTag?: string; radius: number; height: number; period: number; key?: string }) {
    super({ key: opts.key });
    this.o = opts;
  }
  override buildBehaviors(_ctx: BuildContext): Behavior[] {
    const o = this.o;
    return [{
      kind: 'animator-sun-orbit',
      config: o,
      onBuild(ctx) {
        const fn: Tick = (t) => {
          const sun = ctx.refs.get(o.sunTag ?? 'sun') as THREE.DirectionalLight | undefined;
          if (!sun) return;
          const angle = (t / o.period) * Math.PI * 2;
          sun.position.set(Math.cos(angle) * o.radius, o.height, Math.sin(angle) * o.radius);
        };
        return { ticks: [fn] };
      },
    }];
  }
}

// ── GateOnVelocity ──
export class GateOnVelocity extends LeafWidget3D {
  private readonly inner: Tick;
  private readonly o: { minSpeed?: number; smooth?: number } & KeyOpt;
  constructor(inner: Tick, opts: { minSpeed?: number; smooth?: number; key?: string } = {}) {
    super({ key: opts.key }); this.inner = inner; this.o = opts;
  }
  override buildBehaviors(_ctx: BuildContext): Behavior[] {
    return [Animator.gateOnVelocity(this.inner, this.o)];
  }
}

// ── EyeTracker — pivots eye_L/eye_R bones toward a tagged Object3D ──
//
// Looks up `targetTag` from ctx.refs each frame; computes per-eye yaw+pitch
// in eye-local space; clamps to maxAngle; slerps toward target rotation.

import type { ResolvedRig } from '../../rig.js';

export class EyeTracker extends LeafWidget3D {
  private readonly o: { targetTag?: string; smoothness?: number; maxAngle?: number; key?: string };
  constructor(opts: { targetTag?: string; smoothness?: number; maxAngle?: number; key?: string } = {}) {
    super({ key: opts.key });
    this.o = opts;
  }
  override buildBehaviors(_ctx: BuildContext): Behavior[] {
    const o = this.o;
    return [{
      kind: 'animator-eye-tracker',
      config: o,
      onBuild(ctx) {
        const rig = ctx.refs.get('rig') as ResolvedRig | undefined;
        if (!rig) {
          console.warn('[EyeTracker] no rig — skipping');
          return {};
        }
        const eyeL = rig.byRole('eye_L');
        const eyeR = rig.byRole('eye_R');
        if (!eyeL || !eyeR) {
          console.warn('[EyeTracker] no eye_L/eye_R bones — needs detailed-humanoid rig');
          return {};
        }
        const smooth = o.smoothness ?? 0.15;
        const maxAng = o.maxAngle ?? 0.6;
        const targetTag = o.targetTag;
        const tmpW = new THREE.Vector3();
        const tmpL = new THREE.Vector3();
        const tmpQ = new THREE.Quaternion();
        const tmpE = new THREE.Euler();
        const fn: Tick = () => {
          const target = targetTag ? ctx.refs.get(targetTag) as THREE.Object3D | undefined : undefined;
          for (const eye of [eyeL, eyeR]) {
            if (target && (target as THREE.Object3D).isObject3D) {
              target.getWorldPosition(tmpW);
            } else {
              eye.getWorldPosition(tmpW);
              tmpW.add(new THREE.Vector3(0, 0, 1));
            }
            // Convert into eye's parent-local space, then offset relative to eye.
            tmpL.copy(tmpW);
            eye.parent?.worldToLocal(tmpL);
            tmpL.sub(eye.position).normalize();
            const yaw = Math.atan2(tmpL.x, tmpL.z);
            const pitch = Math.atan2(-tmpL.y, Math.hypot(tmpL.x, tmpL.z));
            const cy = Math.max(-maxAng, Math.min(maxAng, yaw));
            const cp = Math.max(-maxAng, Math.min(maxAng, pitch));
            tmpE.set(cp, cy, 0, 'YXZ');
            tmpQ.setFromEuler(tmpE);
            eye.quaternion.slerp(tmpQ, smooth);
          }
        };
        return { ticks: [fn] };
      },
    }];
  }
}

// ── Blink — periodically scales eyes y to 0 and back ──

export class Blink extends LeafWidget3D {
  private readonly o: { rate?: number; duration?: number; key?: string };
  constructor(opts: { rate?: number; duration?: number; key?: string } = {}) {
    super({ key: opts.key });
    this.o = opts;
  }
  override buildBehaviors(_ctx: BuildContext): Behavior[] {
    const rate = this.o.rate ?? 4;
    const dur = this.o.duration ?? 0.12;
    return [{
      kind: 'animator-blink',
      config: { rate, dur },
      onBuild(ctx) {
        const rig = ctx.refs.get('rig') as ResolvedRig | undefined;
        if (!rig) return {};
        const eyeL = rig.byRole('eye_L');
        const eyeR = rig.byRole('eye_R');
        if (!eyeL || !eyeR) return {};
        let next = rate * Math.random();
        const fn: Tick = (t) => {
          const since = t - next;
          let s = 1;
          if (since > 0 && since < dur) {
            const u = since / dur;
            s = 1 - 4 * u * (1 - u); // parabolic
          } else if (since >= dur) {
            next = t + rate * (0.7 + Math.random() * 0.6);
          }
          eyeL.scale.y = s;
          eyeR.scale.y = s;
        };
        return { ticks: [fn] };
      },
    }];
  }
}
